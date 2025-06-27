import Order from "../models/order.model.js";
import Voucher from "../models/voucher.model.js";
import Product from "../models/product.model.js";
import User from "../models/auth.model.js";
import { generateOrderCode } from "../services/order.service.js";
import mongoose from "mongoose";
import nodemailer from "nodemailer";

export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      userId,
      orderCode,
      voucherCode = [],
      recipientInfo,
      shippingAddress,
      items,
      shippingFee,
      paymentMethod,
      cartItemIds = [],
    } = req.body;

    // Validation cơ bản
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "Đơn hàng phải có ít nhất một sản phẩm",
      });
    }

    if (
      !recipientInfo ||
      !recipientInfo.name ||
      !recipientInfo.email ||
      !recipientInfo.phone
    ) {
      return res.status(400).json({
        error: "Thông tin người nhận không đầy đủ",
      });
    }

    // if (!shippingAddress || !shippingAddress.address || !shippingAddress.city) {
    //   return res.status(400).json({
    //     error: "Địa chỉ giao hàng không đầy đủ"
    //   });
    // }

    // Bắt đầu transaction
    session.startTransaction();

    if (paymentMethod === "COD" || paymentMethod === "VNPAY") {
      const variationIds = items.map((i) => i.variationId);
      const products = await Product.find({
        "variation._id": { $in: variationIds },
      }).session(session);

      const orderItems = [];
      const voucherIds = [];

      // Xử lý và validate từng item
      for (const item of items) {
        // 1. Tìm product chứa variation
        const product = products.find((p) =>
          p.variation.some((v) => v._id.toString() === item.variationId)
        );

        if (!product) {
          throw new Error(
            `Không tìm thấy sản phẩm chứa biến thể ${item.variationId}`
          );
        }

        // 2. Lấy biến thể
        const variation = product.variation.id(item.variationId);
        if (!variation) {
          throw new Error(`Không tìm thấy biến thể ${item.variationId}`);
        }

        if (!variation.isActive) {
          throw new Error(
            `Biến thể ${variation._id} của sản phẩm ${product.name} không khả dụng`
          );
        }

        // 3. Kiểm tra số lượng
        if (item.quantity <= 0) {
          throw new Error("Số lượng phải lớn hơn 0");
        }

        if (item.quantity > variation.stock) {
          throw new Error(
            `Số lượng sản phẩm ${product.name} trong kho chỉ còn ${variation.stock}`
          );
        }

        // 4. Tính giá
        let price = variation.regularPrice;
        if (variation.salePrice && variation.salePrice > 0) {
          price = variation.salePrice;
        }

        orderItems.push({
          productId: product._id,
          variationId: variation._id,
          productName: product.name,
          quantity: item.quantity,
          priceAtOrder: price,
          totalPrice: price * item.quantity,
        });
      }

      // Tính subtotal
      const subtotal = orderItems.reduce(
        (sum, item) => sum + item.totalPrice,
        0
      );

      // Xử lý voucher
      let hasShippingVoucher = false;
      let hasProVoucher = false;
      let shippingFeeValue = shippingFee || 40000; // Cập nhật theo bản ghi mẫu
      let discountAmount = 0;

      // Kiểm tra voucher trùng lặp
      const uniqueVoucher = new Set(voucherCode);
      if (uniqueVoucher.size !== voucherCode.length) {
        throw new Error(
          "Không được sử dụng voucher giống nhau trong cùng một đơn hàng"
        );
      }

      // Xử lý từng voucher
      for (const code of voucherCode) {
        const voucher = await Voucher.findOne({ code }).session(session);

        if (!voucher) {
          throw new Error(`Voucher ${code} không tồn tại`);
        }

        voucherIds.push(voucher._id);

        const now = new Date();

        // Kiểm tra tính hợp lệ của voucher
        if (
          voucher.voucherStatus === "inactive" ||
          voucher.voucherStatus === "expired" ||
          now < new Date(voucher.startDate) ||
          now > new Date(voucher.endDate)
        ) {
          throw new Error(
            `Voucher ${voucher.code} không hợp lệ hoặc đã hết hạn`
          );
        }

        if (voucher.used >= voucher.quantity) {
          throw new Error(`Voucher ${voucher.code} đã hết lượt sử dụng`);
        }

        if (voucher.minOrderValues > subtotal) {
          throw new Error(
            `Đơn hàng tối thiểu để sử dụng voucher ${
              voucher.code
            } là ${voucher.minOrderValues.toLocaleString()}₫`
          );
        }

        // Áp dụng voucher
        if (voucher.voucherType === "product") {
          if (hasProVoucher) {
            throw new Error(
              "Chỉ được sử dụng 1 voucher giảm giá sản phẩm mỗi đơn hàng"
            );
          }
          hasProVoucher = true;

          if (voucher.discountType === "fixed") {
            discountAmount += voucher.discountValue;
          } else if (voucher.discountType === "percent") {
            const discount = subtotal * (voucher.discountValue / 100);
            if (discount > voucher.maxDiscount) {
              discountAmount += voucher.maxDiscount;
            } else {
              discountAmount += discount;
            }
          }
        } else if (voucher.voucherType === "shipping") {
          if (hasShippingVoucher) {
            throw new Error(
              "Chỉ được sử dụng 1 voucher giảm phí vận chuyển mỗi đơn hàng"
            );
          }
          hasShippingVoucher = true;

          if (voucher.discountType === "fixed") {
            shippingFeeValue -= voucher.discountValue;
          } else if (voucher.discountType === "percent") {
            const discount = shippingFeeValue * (voucher.discountValue / 100);
            if (discount > voucher.maxDiscount) {
              shippingFeeValue -= voucher.maxDiscount;
            } else {
              shippingFeeValue -= discount;
            }
          }
        }
      }

      // Đảm bảo phí ship không âm
      if (shippingFeeValue < 0) shippingFeeValue = 0;

      // Tính tổng tiền
      const totalAmount = subtotal + shippingFeeValue - discountAmount;

      // Tính ngày giao hàng dự kiến (7 ngày từ hiện tại)
      const expectedDeliveryDate = new Date();
      expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + 7);

      // Tạo order object
      const order = new Order({
        userId: userId || undefined,
        recipientInfo,
        orderCode: orderCode,
        voucherId: voucherIds,
        shippingAddress,
        items: orderItems,
        subtotal,
        shippingFee: shippingFeeValue,
        discountAmount,
        totalAmount,
        status: 0,
        paymentStatus: 0,
        paymentMethod,
        expectedDeliveryDate,
      });

      // Lưu order với session
      const orderSave = await order.save({ session });
      console.log("Order saved:", orderSave);

      if (orderSave) {
        // Cập nhật voucher usage
        if (orderSave.voucherId?.length) {
          await Voucher.updateMany(
            { _id: { $in: orderSave.voucherId } },
            { $inc: { used: 1 } },
            { session }
          );
        }

        // Cập nhật stock sản phẩm
        for (const item of orderSave.items) {
          await Product.updateOne(
            { "variation._id": item.variationId },
            { $inc: { "variation.$.stock": -item.quantity } },
            { session }
          );
        }

        // Xóa cart items nếu có
        if (cartItemIds && cartItemIds.length > 0) {
          const deleteResult = await Cart.deleteMany(
            {
              _id: { $in: cartItemIds },
              userId: userId,
            },
            { session }
          );
          console.log(
            `Đã xóa ${deleteResult.deletedCount} items khỏi giỏ hàng`
          );
        }

        // Commit transaction
        await session.commitTransaction();

        // Gửi email xác nhận (sau khi commit thành công)
        try {
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: "binovaweb73@gmail.com",
              pass: "kcjf jurr rjva hqfu",
            },
          });

          await transporter.sendMail({
            from: '"Binova" <binovaweb73@gmail.com>',
            to: recipientInfo.email,
            subject: `Xác nhận đơn hàng ${orderSave.orderCode}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #4CAF50; text-align: center">🎉 Đặt hàng thành công!</h2>
                <p>Xin chào <strong>${
                  orderSave.recipientInfo.name || "Quý khách"
                }</strong>,</p>
                <p>Chúng tôi đã nhận được đơn hàng <strong>${
                  orderSave.orderCode
                }</strong> của bạn.</p>
                
                <h3>📦 Thông tin đơn hàng:</h3>
                <ul>
                    <li><strong>Mã đơn hàng:</strong> ${
                      orderSave.orderCode
                    }</li>
                    <li><strong>Trạng thái:</strong> ${orderSave.status}</li>
                    <li><strong>Phương thức thanh toán:</strong> ${
                      orderSave.paymentMethod
                    }</li>
                    <li><strong>Trạng thái thanh toán:</strong> ${
                      orderSave.paymentStatus
                    }</li>
                    <li><strong>Ngày giao dự kiến:</strong> ${new Date(
                      orderSave.expectedDeliveryDate
                    ).toLocaleDateString("vi-VN")}</li>
                </ul>

                <h3>📍 Địa chỉ giao hàng:</h3>
                <p>${orderSave.shippingAddress.address}, ${
              orderSave.shippingAddress.city
            }, ${orderSave.shippingAddress.country}</p>

                <h3>🛒 Sản phẩm:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                    <tr style="background: #f0f0f0;">
                        <th style="text-align: left; padding: 8px;">Tên sản phẩm</th>
                        <th style="text-align: center; padding: 8px;">SL</th>
                        <th style="text-align: right; padding: 8px;">Đơn giá</th>
                        <th style="text-align: right; padding: 8px;">Tổng</th>
                    </tr>
                    </thead>
                    <tbody>
                    ${orderSave.items
                      .map(
                        (item) => `
                        <tr>
                        <td style="padding: 8px;">${item.productName}</td>
                        <td style="text-align: center;">${item.quantity}</td>
                        <td style="text-align: right;">${item.priceAtOrder.toLocaleString(
                          "vi-VN"
                        )} VNĐ</td>
                        <td style="text-align: right;">${item.totalPrice.toLocaleString(
                          "vi-VN"
                        )} VNĐ</td>
                        </tr>
                    `
                      )
                      .join("")}
                    </tbody>
                </table>

                <h3>💰 Tóm tắt thanh toán:</h3>
                <ul>
                    <li><strong>Tạm tính:</strong> ${orderSave.subtotal.toLocaleString(
                      "vi-VN"
                    )} VNĐ</li>
                    <li><strong>Phí vận chuyển:</strong> ${orderSave.shippingFee.toLocaleString(
                      "vi-VN"
                    )} VNĐ</li>
                    <li><strong>Giảm giá:</strong> ${orderSave.discountAmount.toLocaleString(
                      "vi-VN"
                    )} VNĐ</li>
                    <li><strong>Tổng cộng:</strong> <span style="color: #4CAF50; font-size: 16px;">${orderSave.totalAmount.toLocaleString(
                      "vi-VN"
                    )} VNĐ</span></li>
                </ul>

                <p style="margin-top: 30px;">Cảm ơn bạn đã mua sắm tại <strong>Binova</strong>! Nếu có bất kỳ thắc mắc nào, hãy phản hồi lại email này để được hỗ trợ.</p>
                <div style="display: flex; justify-content: flex-end; margin-left: 68%;">
                    <div style="text-align: center;">
                        <p>Trân trọng</p>
                        <i><strong>Đội ngũ Binova</strong></i>
                    </div>
                </div>
              </div>
            `,
          });
        } catch (emailError) {
          console.error("Lỗi gửi email:", emailError);
          // Không throw error để không ảnh hưởng đến response
        }

        return res.status(201).json({
          message:
            "Đơn hàng đã được tạo thành công và đã xóa sản phẩm khỏi giỏ hàng",
          order: orderSave,
          cartItemsRemoved: cartItemIds.length,
        });
      }
    } else {
      console.log(1);
      
      throw new Error("Phương thức thanh toán không được hỗ trợ");
    }
  } catch (error) {
    console.error("Lỗi trong transaction:", error);

    // Chỉ abort nếu transaction chưa được commit
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    return res.status(400).json({ error: error.message });
  } finally {
    // Luôn end session
    await session.endSession();
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find();
    return res.status(200).json(orders);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    // Find order và populate product details với variation
    const order = await Order.findById(req.params.id).populate({
      path: "items.productId",
      select: "name variation",
    });

    if (!order) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    }

    // Xử lý items để chỉ lấy variation attributes tương ứng với variationId
    const processedItems = order.items.map((item) => {
      const product = item.productId;

      // Tìm variation cụ thể dựa trên variationId
      const matchedVariation = product.variation.find(
        (v) => v._id.toString() === item.variationId.toString()
      );

      return {
        ...item.toObject(),
        // Chỉ trả về attributes của variation được chọn
        variantAttributes: matchedVariation ? matchedVariation.attributes : [],
      };
    });

    const orderObject = order.toObject();
    orderObject.items = processedItems;

    return res.status(200).json(orderObject);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const getOrderByUserId = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(400).json({ error: "Đăng nhập để tiếp tục" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "ID người dùng không hợp lệ" });
    }

    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    if (!orders || orders.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy đơn hàng cho người dùng này" });
    }

    return res.status(200).json(orders);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus, deliveryDate } = req.body;

    // Kiểm tra các trường được phép cập nhật
    const allowedFields = ["status", "paymentStatus", "deliveryDate"];
    const unknownFields = Object.keys(req.body).filter(
      (key) => !allowedFields.includes(key)
    );
    if (unknownFields.length > 0) {
      return res.status(400).json({
        error: `Không được phép cập nhật trường: ${unknownFields.join(", ")}`,
      });
    }

    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID đơn hàng không hợp lệ" });
    }

    // Tìm đơn hàng
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    }

    // Kiểm tra có thay đổi hay không
    const isSame =
      order.status === status &&
      order.paymentStatus === paymentStatus &&
      new Date(order.deliveryDate).getTime() ===
        new Date(deliveryDate).getTime();

    if (isSame) {
      return res.status(400).json({ error: "Không có thay đổi để cập nhật" });
    }

    // Định nghĩa các trạng thái hợp lệ
    const validStatusTransitions = {
      0: [1, 5],
      1: [2, 5],
      2: [3], 
      3: [4],
      4: [],
      5: [],
      6: [],
    };

    // Kiểm tra và cập nhật trạng thái đơn hàng
    if (status && status !== order.status) {
      const allowedNextStatuses = validStatusTransitions[order.status];

      if (!allowedNextStatuses) {
        return res.status(400).json({
          error: `Trạng thái hiện tại "${order.status}" không hợp lệ`,
        });
      }

      if (!allowedNextStatuses.includes(status)) {
        return res.status(400).json({
          error: `Không thể chuyển trạng thái từ "${order.status}" sang "${status}"`,
        });
      }
      order.status = status;
    }

    // Kiểm tra và cập nhật trạng thái thanh toán
    if (paymentStatus && paymentStatus !== order.paymentStatus) {
      const validPaymentTransitions = {
        0: [1],
        1: [2],
        2: [],
      };

      const allowedNext = validPaymentTransitions[order.paymentStatus];

      if (!allowedNext) {
        return res.status(400).json({
          error: `Trạng thái thanh toán hiện tại "${order.paymentStatus}" không hợp lệ`,
        });
      }

      if (!allowedNext.includes(paymentStatus)) {
        return res.status(400).json({
          error: `Không thể chuyển trạng thái thanh toán từ "${order.paymentStatus}" sang "${paymentStatus}"`,
        });
      }

      order.paymentStatus = paymentStatus;
    }

    // Cập nhật ngày giao hàng
    if (deliveryDate) {
      order.deliveryDate = new Date(deliveryDate);
    }

    // Lưu thay đổi
    await order.save();
    console.log("Order updated status:", order);

    // Mapping cho email
    const subjectMap = {
      0: `Đơn hàng ${order.orderCode} đang chờ xác nhận`,
      1: `Đơn hàng ${order.orderCode} đã được xác nhận`,
      2: `Đơn hàng ${order.orderCode} đang được giao`,
      3: `Đơn hàng ${order.orderCode} đã được giao`,
      4: `Đơn hàng ${order.orderCode} hoàn tất`,
      5: `Đơn hàng ${order.orderCode} đã bị hủy`,
    };

    const messageMap = {
      0: `Chúng tôi đã nhận được đơn hàng của bạn và đang chờ xác nhận.`,
      1: `Đơn hàng của bạn đã được xác nhận và đang được chuẩn bị để giao.`,
      2: `Đơn hàng của bạn đang được vận chuyển. Vui lòng giữ liên lạc để nhận hàng sớm nhất.`,
      3: `Đơn hàng của bạn đã được giao. Vui lòng kiểm tra và xác nhận nếu có bất kỳ vấn đề gì.`,
      4: `Cảm ơn bạn! Đơn hàng đã hoàn tất. Rất mong được phục vụ bạn lần sau.`,
      5: `Đơn hàng của bạn đã bị hủy. Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ đội ngũ hỗ trợ của chúng tôi.`,
    };

    // Kiểm tra trạng thái có hợp lệ để gửi email
    if (!subjectMap[order.status]) {
      return res
        .status(400)
        .json({ error: "Trạng thái không hợp lệ để gửi email" });
    }

    // Gửi email thông báo
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "binovaweb73@gmail.com",
          pass: "kcjf jurr rjva hqfu",
        },
      });

      await transporter.sendMail({
        from: '"Binova" <binovaweb73@gmail.com>',
        to: "phongne2005@gmail.com",
        subject: subjectMap[order.status],
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4CAF50;">Cập nhật đơn hàng ${
              order.orderCode
            }</h2>
            <p>Xin chào <strong>${
              order.recipientInfo.name || "Quý khách"
            }</strong>,</p>
            <p>${messageMap[order.status]}</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Thông tin đơn hàng:</h3>
              <p><strong>Mã đơn hàng:</strong> ${order.orderCode}</p>
              <p><strong>Trạng thái:</strong> ${order.status}</p>
              <p><strong>Trạng thái thanh toán:</strong> ${
                order.paymentStatus
              }</p>
              ${
                order.deliveryDate
                  ? `<p><strong>Ngày giao dự kiến:</strong> ${new Date(
                      order.deliveryDate
                    ).toLocaleDateString("vi-VN")}</p>`
                  : ""
              }
            </div>

            <p style="margin-top: 30px;">Nếu bạn có bất kỳ câu hỏi nào, hãy phản hồi email này để được hỗ trợ.</p>
            <div style="text-align: right; margin-top: 40px;">
              <p>Trân trọng,</p>
              <i><strong>Đội ngũ Binova</strong></i>
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Lỗi gửi email:", emailError);
      // Không return lỗi ở đây vì đơn hàng đã được cập nhật thành công
    }

    return res.status(200).json({
      message: "Cập nhật trạng thái thành công",
      order: {
        id: order._id,
        orderCode: order.orderCode,
        status: order.status,
        paymentStatus: order.paymentStatus,
        deliveryDate: order.deliveryDate,
      },
    });
  } catch (error) {
    console.error("Lỗi cập nhật đơn hàng:", error);
    return res.status(500).json({
      error: "Lỗi server khi cập nhật đơn hàng",
      details: error.message,
    });
  }
};

export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req?.body?.paymentStatus) {
      return res
        .status(400)
        .json({ error: "Trạng thái thanh toán là bắt buộc." });
    }

    const { paymentStatus } = req.body;

    const allowedFields = ["paymentStatus"];
    const unknownFields = Object.keys(req.body).filter(
      (key) => !allowedFields.includes(key)
    );
    if (unknownFields.length > 0) {
      return res.status(400).json({
        error: `Không được phép cập nhật trường: ${unknownFields.join(", ")}`,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID đơn hàng không hợp lệ" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    }

    const isSame = order.paymentStatus === paymentStatus;
    if (isSame) {
      return res.status(400).json({ error: "Không có thay đổi để cập nhật" });
    }

    if (paymentStatus === "Da thanh toan") {
      if (order.paymentMethod === "COD") {
        if (!["Da giao hang"].includes(order.status)) {
          return res.status(400).json({
            error:
              "Chỉ cập nhật 'Da thanh toan' cho đơn COD sau khi đã giao hàng",
          });
        }
      }
    }

    if (paymentStatus && paymentStatus !== order.paymentStatus) {
      const validPaymentTransitions = {
        0 : [1],
        1 : [2],
        2 : [],
      };

      const allowedNext = validPaymentTransitions[order.paymentStatus];
      if (!allowedNext.includes(paymentStatus)) {
        return res.status(400).json({
          error: `Không thể chuyển trạng thái thanh toán từ "${order.paymentStatus}" sang "${paymentStatus}"`,
        });
      }

      order.paymentStatus = paymentStatus;
    }

    await order.save();
    console.log("Order updated payment-status:", order);

    const paymentSubjectMap = {
      "Đã thanh toán": `Xác nhận thanh toán đơn hàng ${order.orderCode}`,
      "Đã hoàn tiền": `Xác nhận hoàn tiền đơn hàng ${order.orderCode}`,
    };

    const paymentMessageMap = {
      1: `Cảm ơn bạn! Chúng tôi đã nhận được thanh toán cho đơn hàng ${order.orderCode}.`,
      2: `Chúng tôi đã hoàn tiền cho đơn hàng ${order.orderCode}. Vui lòng kiểm tra tài khoản của bạn.`,
    };

    if (!paymentSubjectMap[order.paymentStatus])
      return res
        .status(400)
        .json({ error: "Trạng thái thanh toán không hợp lệ" });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "binovaweb73@gmail.com",
        pass: "kcjf jurr rjva hqfu",
      },
    });

    await transporter.sendMail({
      from: '"Binova" <binovaweb73@gmail.com>',
      to: "phongne2005@gmail.com",
      subject: paymentSubjectMap[order.paymentStatus],
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #2196F3;">Thanh toán đơn hàng ${
                      order.orderCode
                    }</h2>
                    <p>Xin chào <strong>${
                      orderSave.recipientInfo.name || "Quý khách"
                    }</strong>,</p>
                    <p>${paymentMessageMap[order.paymentStatus]}</p>

                    <p style="margin-top: 30px;">Nếu bạn có bất kỳ câu hỏi nào, hãy phản hồi email này để được hỗ trợ.</p>
                    <div style="text-align: right; margin-top: 40px;">
                        <p>Trân trọng,</p>
                        <i><strong>Đội ngũ Binova</strong></i>
                    </div>
                </div>
            `,
    });

    return res
      .status(200)
      .json({ message: "Cập nhật trạng thái thanh toán thành công", order });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderCode, email } = req.body;

    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID đơn hàng không hợp lệ" });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    }

    const isAdminOrStaff = userRole === "admin" || userRole === "staff";
    const isOwner = userId && order.userId?.toString() === userId;

    const isGuest = !userId;

    // 2. Nếu là khách chưa đăng nhập -> kiểm tra orderCode và email (không biết có cần OTP không)
    if (isGuest) {
      if (!orderCode || !email) {
        return res.status(400).json({
          error:
            "Khách chưa đăng nhập cần cung cấp orderCode và email để hủy đơn.",
        });
      }

      if (
        order.orderCode !== orderCode ||
        order.recipientInfo.email !== email
      ) {
        return res
          .status(403)
          .json({ error: "Thông tin xác nhận không đúng. Không thể hủy đơn." });
      }
    } else if (!isOwner && !isAdminOrStaff) {
      // 3. Nếu đã đăng nhập nhưng không phải admin/staff hoặc chủ đơn
      return res
        .status(403)
        .json({ error: "Bạn không có quyền hủy đơn hàng này" });
    }

    // 4. Chỉ cho phép hủy nếu trạng thái là "Chờ xác nhận" hoặc "Đã xác nhận"
    const cancelableStatus = ["Cho xac nhan", "Da xac nhan"];
    if (!cancelableStatus.includes(order.status)) {
      return res.status(400).json({
        error: `Chỉ được hủy đơn hàng khi đang ở trạng thái: ${cancelableStatus.join(
          ", "
        )}`,
      });
    }

    // 5. Cập nhật trạng thái, hoàn hàng và hoàn voucher
    // Đang làm cho đơn COD, nếu là đơn thanh toán online thì cần hoàn tiền về ví và cập nhật trạng thái thanh toán là "Da hoan tien"
    if (order.paymentStatus === "Da thanh toan") {
      // TODO: gọi hàm hoàn tiền qua cổng thanh toán
      order.paymentStatus = "Da hoan tien";
    }

    order.status = "Da huy";

    for (const item of order.items) {
      await Product.updateOne(
        { "variation._id": item.variationId },
        { $inc: { "variation.$.stock": item.quantity } }
      );
    }

    if (order.voucherId?.length > 0) {
      await Voucher.updateMany(
        { _id: { $in: order.voucherId } },
        { $inc: { used: -1 } }
      );
    }

    await order.save();

    // 6. Gửi email thông báo
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "binovaweb73@gmail.com",
        pass: "kcjf jurr rjva hqfu",
      },
    });

    await transporter.sendMail({
      from: '"Binova" <binovaweb73@gmail.com>',
      to: order.recipientInfo.email,
      subject: `Đơn hàng ${order.orderCode} đã bị hủy`,
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #f44336;">Đơn hàng đã bị hủy</h2>
                    <p>Xin chào <strong>${
                      order.recipientInfo.name || "Quý khách"
                    }</strong>,</p>
                    <p>Đơn hàng <strong>${
                      order.orderCode
                    }</strong> của bạn đã được hủy.</p>
                    <p>Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ với đội ngũ hỗ trợ của chúng tôi.</p>
                    <div style="text-align: right; margin-top: 40px;">
                        <p>Trân trọng,</p>
                        <i><strong>Đội ngũ Binova</strong></i>
                    </div>
                </div>
            `,
    });

    return res
      .status(200)
      .json({ message: "Đơn hàng đã được hủy thành công", order });
  } catch (error) {
    console.error("Hủy đơn thất bại:", error.message);
    return res.status(500).json({ error: error.message });
  }
};
