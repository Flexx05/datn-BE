import mongoose from "mongoose";
import nodemailer from "nodemailer";
import { authModel } from "../models/auth.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import Voucher from "../models/voucher.model.js";
import { nontifyAdmin } from "./nontification.controller.js";
import { getSocketInstance } from "../socket.js";

export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      userId,
      voucherCode = [],
      recipientInfo,
      shippingAddress,
      items,
      shippingFee,
      paymentMethod,
      cartItemIds = [],
      subtotal: clientSubtotal,
      discountAmount: clientDiscountAmount,
      totalAmount: clientTotalAmount,
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

    if (!shippingAddress) {
      return res.status(400).json({
        error: "Địa chỉ giao hàng không đầy đủ",
      });
    }

    // Bắt đầu transaction
    session.startTransaction();

    if (paymentMethod === "COD" || paymentMethod === "VNPAY") {
      const variationIds = items.map((i) => i.variationId);
      const products = await Product.find({
        "variation._id": { $in: variationIds },
      }).session(session);

      const orderItems = [];
      const voucherIds = [];
      let discountAmount = 0;
      const shippingFeeValue = shippingFee || 40000; // Default to 40000 as per example

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
        if (item.priceAtOrder !== variation.regularPrice) {
          throw new Error(
            `Giá sản phẩm ${product.name} đã thay đổi. Vui lòng kiểm tra lại`
          );
        }
        if (item.quantity <= 0) {
          throw new Error("Số lượng phải lớn hơn 0");
        }

        if (item.quantity > variation.stock) {
          throw new Error(
            `Số lượng sản phẩm ${product.name} trong kho chỉ còn ${variation.stock}`
          );
        }

        // 3. Tính giá
        let price = variation.regularPrice;
        if (variation.salePrice && variation.salePrice > 0) {
          price = variation.salePrice;
        }

        orderItems.push({
          productId: product._id,
          variationId: variation._id,
          productName: product.name,
          image: variation.image || product.image,
          slug: item.slug,
          size: item.size,
          color: item.color,
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

      // Kiểm tra subtotal từ client
      if (clientSubtotal !== subtotal) {
        throw new Error(
          `Subtotal không khớp: client (${clientSubtotal}) != server (${subtotal})`
        );
      }

      // Xử lý voucher
      let hasVoucher = false;

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

        // Áp dụng voucher (luôn giảm vào subtotal)
        if (hasVoucher) {
          throw new Error("Chỉ được sử dụng 1 voucher mỗi đơn hàng");
        }
        hasVoucher = true;

        if (voucher.discountType === "fixed") {
          discountAmount += Math.min(voucher.discountValue, subtotal);
        } else if (voucher.discountType === "percent") {
          const discount = (subtotal * voucher.discountValue) / 100;
          discountAmount += voucher.maxDiscount
            ? Math.min(discount, voucher.maxDiscount)
            : discount;
        }
      }

      // Kiểm tra discountAmount từ client
      if (clientDiscountAmount !== discountAmount) {
        throw new Error(
          `Discount amount không khớp: client (${clientDiscountAmount}) != server (${discountAmount})`
        );
      }

      // Tính tổng tiền
      const totalAmount = subtotal + shippingFeeValue - discountAmount;

      // Kiểm tra totalAmount từ client
      if (clientTotalAmount !== totalAmount) {
        throw new Error(
          `Total amount không khớp: client (${clientTotalAmount}) != server (${totalAmount})`
        );
      }

      // Đảm bảo tổng tiền không âm
      if (totalAmount < 0) {
        throw new Error("Tổng tiền đơn hàng không thể âm");
      }

      // Tính ngày giao hàng dự kiến (7 ngày từ hiện tại)
      const expectedDeliveryDate = new Date();
      expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + 7);

      const generateOrderCode = () => {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const day = date.getDate().toString().padStart(2, "0");
        const random = Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, "0");
        return `DH${year}${month}${day}-${random}`;
      };

      // Tạo order object
      const order = new Order({
        userId: userId || undefined,
        recipientInfo,
        orderCode: generateOrderCode(),
        voucherId: voucherIds,
        shippingAddress,
        items: orderItems,
        subtotal,
        shippingFee: shippingFeeValue,
        discountAmount,
        totalAmount,
        status: 0,
        review: 0,
        paymentStatus: 0,
        paymentMethod,
        expectedDeliveryDate,
      });

      // Lưu order với session
      const orderSave = await order.save({ session });

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
                <p>${orderSave.shippingAddress}</p>

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

        try {
          await nontifyAdmin(
            "order",
            orderSave.recipientInfo.name,
            orderSave.status,
            orderSave.orderCode,
            orderSave._id
          );
        } catch (error) {
          console.error("Lỗi gửi thông báo cho admin:", error);
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
    const { _sort = "createdAt", _order = "desc" } = req.query;

    const sortOption = {};
    sortOption[_sort] = _order.toLowerCase() === "asc" ? 1 : -1;

    const orders = await Order.find().sort(sortOption);

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

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
    const userId = req.params.id;

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
    const {
      status,
      paymentStatus,
      deliveryDate,
      reason,
      cancelReason,
      userId,
      review,
    } = req.body;

    // Kiểm tra các trường được phép cập nhật
    const allowedFields = [
      "status",
      "paymentStatus",
      "deliveryDate",
      "cancelReason",
      "reason",
      "userId",
      "review",
    ];
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

    // Nếu có trường review, chỉ cập nhật review = 1
    if (review !== undefined) {
      order.review = 1;
      // Lưu thay đổi
      await order.save();
      console.log("Order updated review:", order);

      return res.status(200).json({
        message: "Cập nhật review thành công",
        order: {
          id: order._id,
          orderCode: order.orderCode,
          status: order.status,
          paymentStatus: order.paymentStatus,
          deliveryDate: order.deliveryDate,
          cancelReason: order.cancelReason,
          review: order.review,
        },
      });
    }

    // Kiểm tra có thay đổi hay không cho các trường khác
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
      3: [4, 6],
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
        0: [1, 3],
        1: [2, 3],
        2: [],
        3: [],
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
    order.cancelReason = cancelReason || reason || null;

    // Lưu thay đổi
    const updateData = {
      status: order.status,
      paymentStatus: order.paymentStatus,
      cancelReason: order.cancelReason,
    };
    await Order.findByIdAndUpdate(id, updateData, { new: true });
    console.log("Order updated status:", order);

    // Mapping cho email
    const subjectMap = {
      0: `Đơn hàng ${order.orderCode} đang chờ xác nhận`,
      1: `Đơn hàng ${order.orderCode} đã được xác nhận`,
      2: `Đơn hàng ${order.orderCode} đang được giao`,
      3: `Đơn hàng ${order.orderCode} đã được giao`,
      4: `Đơn hàng ${order.orderCode} hoàn tất`,
      5: `Đơn hàng ${order.orderCode} đã bị hủy`,
      6: `Đơn hàng ${order.orderCode} đã yêu cầu hoàn hàng`,
    };

    const messageMap = {
      0: `Chúng tôi đã nhận được đơn hàng của bạn và đang chờ xác nhận.`,
      1: `Đơn hàng của bạn đã được xác nhận và đang được chuẩn bị để giao.`,
      2: `Đơn hàng của bạn đang được vận chuyển. Vui lòng giữ liên lạc để nhận hàng sớm nhất.`,
      3: `Đơn hàng của bạn đã được giao. Vui lòng kiểm tra và xác nhận nếu có bất kỳ vấn đề gì.`,
      4: `Cảm ơn bạn! Đơn hàng đã hoàn tất. Rất mong được phục vụ bạn lần sau.`,
      5: `Đơn hàng của bạn đã bị hủy. Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ đội ngũ hỗ trợ của chúng tôi.`,
      6: `Bạn đã yêu cầu hoàn hàng. Vui lòng chờ chúng tôi xử lý yêu cầu của bạn.`,
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
        to: order.recipientInfo.email,
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

    const statusMap = {
      0: "Chờ xác nhận",
      1: "Đã xác nhận",
      2: "Đang giao hàng",
      3: "Đã giao hàng",
      4: "Hoàn thành",
      5: "Đã hủy",
      6: "Hoàn hàng",
    };

    try {
      const user = await authModel.findById(userId);
      console.log(1);
      
      if (!user)
        return res.status(404).json({ error: "Không tìm thấy người dùng" });
      if (user.role === "user") {
        console.log(2);
        await nontifyAdmin(
          1,
          user.fullName,
          order.status,
          order.orderCode,
          order._id
        );
      } else {
        console.log(3);
        
        const io = getSocketInstance();
        console.log(4);
        
        const message = `Đơn hàng ${
          order.orderCode
        } đã được cập nhật trạng thái: ${statusMap[order.status]}`;
        console.log(5);
        
        io.to(order.userId.toString()).emit("order-status-changed", {
          message,
        });
      }
    } catch (error) {
      console.log("Lỗi gửi thống báo cho người dùng: ", error);
      return res
        .status(500)
        .json({ error: "Lỗi gửi thông báo cho người dùng" });
    }

    return res.status(200).json({
      message: "Cập nhật trạng thái thành công",
      order: {
        id: order._id,
        orderCode: order.orderCode,
        status: order.status,
        paymentStatus: order.paymentStatus,
        deliveryDate: order.deliveryDate,
        cancelReason: order.cancelReason,
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
        0: [1],
        1: [2],
        2: [],
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
      1: `Xác nhận thanh toán đơn hàng ${order.orderCode}`,
      2: `Xác nhận hoàn tiền đơn hàng ${order.orderCode}`,
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
      to: order.recipientInfo.email,
      subject: paymentSubjectMap[order.paymentStatus],
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #2196F3;">Thanh toán đơn hàng ${
                      order.orderCode
                    }</h2>
                    <p>Xin chào <strong>${
                      order.recipientInfo.name || "Quý khách"
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

export const updateOrderTotal = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { id } = req.params;
    const { refundAmount } = req.body;

    // Validate input
    if (!refundAmount || typeof refundAmount !== "number" || refundAmount < 0) {
      throw new Error("Refund amount must be a non-negative number");
    }

    // Find the order
    const order = await Order.findById(id).session(session);
    if (!order) {
      throw new Error("Order not found");
    }

    // Calculate new totalAmount
    const newTotalAmount = Math.max(0, order.totalAmount - refundAmount);

    // Update order
    order.totalAmount = newTotalAmount;

    // If fully refunded, update paymentStatus to 2 ("Hoàn tiền")
    if (newTotalAmount === 0) {
      order.paymentStatus = 2;
    }
    order.status = 4;
    await order.save({ session });

    await session.commitTransaction();
    return res.status(200).json({
      success: true,
      message: "Order total updated successfully",
      order: {
        _id: order._id,
        orderCode: order.orderCode,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
      },
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update order total",
    });
  } finally {
    await session.endSession();
  }
};
