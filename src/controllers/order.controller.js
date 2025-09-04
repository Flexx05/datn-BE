import mongoose from "mongoose";
import nodemailer from "nodemailer";
import { authModel } from "../models/auth.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import Voucher from "../models/voucher.model.js";
import { nontifyAdmin } from "./nontification.controller.js";
import { getSocketInstance } from "../socket.js";
import { handleRankUpdate } from "./rank.controller.js";

const ORDER_STATUS_MAP = {
  0: "Chờ xác nhận",
  1: "Đã xác nhận",
  2: "Đang giao hàng",
  3: "Đã giao hàng",
  4: "Hoàn thành",
  5: "Đã hủy",
  6: "Hoàn hàng",
};

const PAYMENT_STATUS_MAP = {
  0: "Chưa thanh toán",
  1: "Đã thanh toán",
  2: "Hoàn tiền",
  3: "Đã hủy",
};
const PAYMENT_METHOD_MAP = {
  COD: "Thanh toán khi nhận hàng",
  VNPAY: "Thanh toán qua VNPAY",
  VI: "Thanh toán qua ví Binova",
};

const createEmailTemplate = (order, recipientInfo) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9;">
      <div style="text-align: center; padding-bottom: 20px;">
        <h1 style="color: #4CAF50; margin: 0;">Binova</h1>
        <h2 style="color: #333; font-size: 24px; margin: 10px 0;">Đặt hàng thành công! 🎉</h2>
      </div>
      
      <p style="color: #333; font-size: 16px;">Xin chào <strong>${
        recipientInfo.name || "Quý khách"
      }</strong>,</p>
      <p style="color: #666;">Cảm ơn bạn đã đặt hàng tại Binova. Đơn hàng <strong>${
        order.orderCode
      }</strong> của bạn đã được tiếp nhận.</p>
      <p style="color: #666;">Bạn có thể theo dõi đơn hàng tại http://localhost:5173/order/${order.orderCode}</p>

      <h3 style="color: #333; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px;">📦 Thông tin đơn hàng</h3>
      <table style="width: 100%; color: #333; font-size: 14px;">
        <tr><td style="padding: 5px 0;"><strong>Mã đơn hàng:</strong></td><td>${
          order.orderCode
        }</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Trạng thái:</strong></td><td>${
          ORDER_STATUS_MAP[order.status]
        }</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Phương thức thanh toán:</strong></td><td>${
          PAYMENT_METHOD_MAP[order.paymentMethod]
        }</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Trạng thái thanh toán:</strong></td><td>${
          PAYMENT_STATUS_MAP[order.paymentStatus]
        }</td></tr>
        <tr><td style="padding: 5px 0;"><strong>Ngày giao dự kiến:</strong></td><td>${new Date(
          order.expectedDeliveryDate
        ).toLocaleDateString("vi-VN")}</td></tr>
      </table>

      <h3 style="color: #333; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px; margin-top: 20px;">📍 Địa chỉ giao hàng</h3>
      <p style="color: #666;">${order.shippingAddress}</p>

      <h3 style="color: #333; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px; margin-top: 20px;">🛒 Chi tiết sản phẩm</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #f0f0f0;">
            <th style="text-align: left; padding: 10px; color: #333;">Sản phẩm</th>
            <th style="text-align: center; padding: 10px; color: #333;">Số lượng</th>
            <th style="text-align: right; padding: 10px; color: #333;">Đơn giá</th>
            <th style="text-align: right; padding: 10px; color: #333;">Tổng</th>
          </tr>
        </thead>
        <tbody>
          ${order.items
            .map(
              (item) => `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">${
                item.productName
              }</td>
              <td style="text-align: center; padding: 10px; border-bottom: 1px solid #e0e0e0;">${
                item.quantity
              }</td>
              <td style="text-align: right; padding: 10px; border-bottom: 1px solid #e0e0e0;">${item.priceAtOrder.toLocaleString(
                "vi-VN"
              )} VNĐ</td>
              <td style="text-align: right; padding: 10px; border-bottom: 1px solid #e0e0e0;">${item.totalPrice.toLocaleString(
                "vi-VN"
              )} VNĐ</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>

      <h3 style="color: #333; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px;">💰 Tóm tắt thanh toán</h3>
      <table style="width: 100%; color: #333; font-size: 14px;">
        <tr><td style="padding: 5px 0;">Tạm tính:</td><td style="text-align: right;">${order.subtotal.toLocaleString(
          "vi-VN"
        )} VNĐ</td></tr>
        <tr><td style="padding: 5px 0;">Phí vận chuyển:</td><td style="text-align: right;">${order.shippingFee.toLocaleString(
          "vi-VN"
        )} VNĐ</td></tr>
        <tr><td style="padding: 5px 0;">Giảm giá:</td><td style="text-align: right;">${order.discountAmount.toLocaleString(
          "vi-VN"
        )} VNĐ</td></tr>
        <tr><td style="padding: 5px 0; font-weight: bold;">Tổng cộng:</td><td style="text-align: right; color: #4CAF50; font-weight: bold;">${order.totalAmount.toLocaleString(
          "vi-VN"
        )} VNĐ</td></tr>
      </table>

      <div style="margin-top: 20px; text-align: center; color: #666;">
        <p>Cảm ơn bạn đã mua sắm tại <strong>Binova</strong>!</p>
        <p>Nếu có thắc mắc, vui lòng liên hệ qua email <a href="mailto:binovaweb73@gmail.com" style="color: #4CAF50;">binovaweb73@gmail.com</a></p>
      </div>

      <div style="text-align: right; margin-top: 20px; color: #666;">
        <p>Trân trọng,</p>
        <p><strong>Đội ngũ Binova</strong></p>
      </div>
    </div>
  `;
};

////// done
export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      userId,
      voucherCode = [],
      recipientInfo,
      shippingAddress,
      items,
      shippingFee: clientShippingFee,
      paymentMethod,
      cartItemIds = [],
      subtotal: clientSubtotal,
      discountAmount: clientDiscountAmount,
      totalAmount: clientTotalAmount,
      paymentStatus: clientPaymentStatus,
    } = req.body;

    // Basic validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ error: "Đơn hàng phải có ít nhất một sản phẩm" });
    }

    if (
      !recipientInfo ||
      !recipientInfo.name ||
      !recipientInfo.email ||
      !recipientInfo.phone
    ) {
      return res
        .status(400)
        .json({ error: "Thông tin người nhận không đầy đủ" });
    }

    if (!shippingAddress) {
      return res.status(400).json({ error: "Địa chỉ giao hàng không đầy đủ" });
    }

    // Start transaction
    session.startTransaction();

    if (
      paymentMethod === "COD" ||
      paymentMethod === "VNPAY" ||
      paymentMethod === "VI"
    ) {
      const variationIds = items.map((i) => i.variationId);
      const products = await Product.find({
        "variation._id": { $in: variationIds },
      }).session(session);

      const orderItems = [];
      let productDiscount = 0;
      let shippingDiscount = 0;
      const shippingFeeValue = clientShippingFee || 30000;

      // Process and validate items
      for (const item of items) {
        const product = products.find((p) =>
          p.variation.some((v) => v._id.toString() === item.variationId)
        );
        if (!product) {
          throw new Error(
            `Không tìm thấy sản phẩm chứa biến thể ${item.variationId}`
          );
        }

        const variation = product.variation.id(item.variationId);
        if (!variation) {
          throw new Error(`Không tìm thấy biến thể ${item.variationId}`);
        }

        if (!variation.isActive) {
          throw new Error(
            `Biến thể ${variation._id} của sản phẩm ${product.name} không khả dụng`
          );
        }

        if (
          item.priceAtOrder !== variation.regularPrice &&
          item.priceAtOrder !== variation.salePrice
        ) {
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

        // Calculate price
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

      // Calculate subtotal
      const subtotal = orderItems.reduce(
        (sum, item) => sum + item.totalPrice,
        0
      );

      // Validate client subtotal
      if (clientSubtotal !== subtotal) {
        throw new Error(
          `Subtotal không khớp: client (${clientSubtotal}) != server (${subtotal})`
        );
      }

      // Process vouchers
      const uniqueVoucherCodes = new Set(voucherCode);
      if (uniqueVoucherCodes.size !== voucherCode.length) {
        throw new Error(
          "Không được sử dụng voucher giống nhau trong cùng một đơn hàng"
        );
      }

      let productVoucherCount = 0;
      let shippingVoucherCount = 0;

      if (voucherCode.length > 2) {
        throw new Error(
          "Chỉ được sử dụng tối đa một voucher sản phẩm và một voucher vận chuyển"
        );
      }

      const vouchers = await Voucher.find({
        code: { $in: voucherCode },
      }).session(session);

      for (const voucherCode of uniqueVoucherCodes) {
        const voucher = vouchers.find((v) => v.code.toString() === voucherCode);
        if (!voucher) {
          throw new Error(`Voucher code ${voucherCode} không tồn tại`);
        }

        const now = new Date();
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

        if (voucher.voucherType === "product") {
          if (productVoucherCount > 0) {
            throw new Error(
              "Chỉ được sử dụng một voucher sản phẩm mỗi đơn hàng"
            );
          }
          if (voucher.minOrderValues > subtotal) {
            throw new Error(
              `Đơn hàng tối thiểu để sử dụng voucher ${
                voucher.code
              } là ${voucher.minOrderValues.toLocaleString()}₫`
            );
          }
          productVoucherCount++;
          if (voucher.discountType === "fixed") {
            productDiscount += Math.min(
              Number(voucher.discountValue) || 0,
              subtotal
            );
          } else if (voucher.discountType === "percent") {
            const discount =
              (subtotal * (Number(voucher.discountValue) || 0)) / 100;
            productDiscount += voucher.maxDiscount
              ? Math.min(discount, Number(voucher.maxDiscount) || Infinity)
              : discount;
          }
        } else if (voucher.voucherType === "shipping") {
          if (shippingVoucherCount > 0) {
            throw new Error(
              "Chỉ được sử dụng một voucher vận chuyển mỗi đơn hàng"
            );
          }
          shippingVoucherCount++;
          if (voucher.discountType === "fixed") {
            shippingDiscount += Math.min(
              Number(voucher.discountValue) || 0,
              shippingFeeValue
            );
          } else if (voucher.discountType === "percent") {
            const discount =
              (shippingFeeValue * (Number(voucher.discountValue) || 0)) / 100;
            shippingDiscount += voucher.maxDiscount
              ? Math.min(discount, Number(voucher.maxDiscount) || Infinity)
              : discount;
          }
        }
      }

      // Validate client discount amount
      const totalDiscount = productDiscount + shippingDiscount;
      if (clientDiscountAmount !== totalDiscount) {
        throw new Error(
          `Discount amount không khớp: client (${clientDiscountAmount}) != server (${totalDiscount})`
        );
      }

      // Calculate total amount
      const totalAmount =
        subtotal + shippingFeeValue - productDiscount - shippingDiscount;

      // Validate client total amount
      if (clientTotalAmount !== totalAmount) {
        throw new Error(
          `Total amount không khớp: client (${clientTotalAmount}) != server (${totalAmount})`
        );
      }

      // Ensure total amount is non-negative
      if (totalAmount < 0) {
        throw new Error("Tổng tiền đơn hàng không thể âm");
      }

      // Calculate expected delivery date
      const expectedDeliveryDate = new Date();
      expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + 7);

      // Generate order code
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

      // Create order
      const order = new Order({
        userId: userId || undefined,
        recipientInfo,
        orderCode: generateOrderCode(),
        voucherCode,
        shippingAddress,
        items: orderItems,
        subtotal,
        shippingFee: shippingFeeValue,
        discountAmount: totalDiscount,
        totalAmount,
        status: 0,
        review: 0,
        paymentStatus: clientPaymentStatus,
        paymentMethod,
        expectedDeliveryDate,
        statusHistory: [
          {
            status: 0,
            updatedByUser: userId || null,
            updatedByType: userId ? "user" : "guest",
            note: null
          }
        ],
        paymentStatusHistory: [
          {
            paymentStatus: clientPaymentStatus,
            updatedByUser: userId || null,
            updatedByType: userId ? "user" : "guest",
            note: null
          }
        ]
      });

      // Save order
      const orderSave = await order.save({ session });
      if (orderSave) {
        // Update voucher usage
        if (orderSave.voucherCode?.length) {
          await Voucher.updateMany(
            { code: { $in: orderSave.voucherCode } },
            { $inc: { used: 1 } },
            { session }
          );
        }

        // Update product stock
        for (const item of orderSave.items) {
          await Product.updateOne(
            { "variation._id": item.variationId },
            { $inc: { "variation.$.stock": -item.quantity } },
            { session }
          );
        }

        // Remove cart items
        if (cartItemIds && cartItemIds.length > 0) {
          await Cart.deleteMany(
            {
              _id: { $in: cartItemIds },
              userId: userId,
            },
            { session }
          );
        }

        // Commit transaction
        await session.commitTransaction();

        // Send confirmation email
        try {
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: process.env.EMAIL_USER || "binovaweb73@gmail.com",
              pass: process.env.EMAIL_PASS || "kcjf jurr rjva hqfu",
            },
          });

          await transporter.sendMail({
            from: '"Binova" <binovaweb73@gmail.com>',
            to: recipientInfo.email,
            subject: `Xác nhận đơn hàng ${orderSave.orderCode}`,
            html: createEmailTemplate(orderSave, recipientInfo),
          });
        } catch (emailError) {
          console.error(
            "Failed to send confirmation email:",
            emailError.message
          );
          // Note: Not throwing error here to avoid failing the order creation
          // Email failure shouldn't prevent order from being processed
        }

        const io = getSocketInstance();
        io.to("admin").emit("order-status-changed", { order: orderSave });

        // Notify admin
        try {
          await nontifyAdmin(
            0,
            "Có đơn hàng mới",
            `Có đơn hàng mới từ khách hàng ${recipientInfo.name}`,
            orderSave._id,
            null
          );
        } catch (error) {
          console.error("Admin notification error:", error.message);
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
    console.error("Transaction error:", error);
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    return res.status(400).json({ error: error.message });
  } finally {
    await session.endSession();
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const { _sort = "createdAt", _order = "desc" } = req.query;

    const sortOption = {};
    sortOption[_sort] = _order.toLowerCase() === "asc" ? 1 : -1;

    const orders = await Order.find()
      .populate("userId", "fullName email avatar rank isActive role")
      .sort(sortOption);

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
export const getOrderByCode = async (req, res) => {
  try {
    const { code } = req.params;

    // Tìm đơn hàng theo orderCode và populate product + variation
    const order = await Order.findOne({ orderCode: code }).populate({
      path: "items.productId",
      select: "name variation",
    });

    if (!order) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    }

    // Xử lý items để chỉ lấy variation attributes tương ứng
    const processedItems = order.items.map((item) => {
      const product = item.productId;

      const matchedVariation = product?.variation?.find(
        (v) => v._id.toString() === item.variationId.toString()
      );

      return {
        ...item.toObject(),
        variantAttributes: matchedVariation ? matchedVariation.attributes : [],
      };
    });

    const orderObject = order.toObject();
    orderObject.items = processedItems;

    return res.status(200).json(orderObject);
  } catch (error) {
    return res.status(400).json({ error: "Đã xảy ra lỗi khi tìm đơn hàng" });
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

const nodemailer = require("nodemailer");

const createStatusUpdateEmailTemplate = (order, statusMap, messageMap) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9;">
      <div style="text-align: center; padding-bottom: 20px;">
        <h1 style="color: #4CAF50; margin: 0;">Binova</h1>
        <h2 style="color: #333; font-size: 24px; margin: 10px 0;">Cập nhật trạng thái đơn hàng</h2>
      </div>
      
      <p style="color: #333; font-size: 16px;">Xin chào <strong>${
        order.recipientInfo.name || "Quý khách"
      }</strong>,</p>
      <p style="color: #666;">${messageMap[order.status]}</p>
      
      <div style="background-color: #ffffff; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #e0e0e0;">
        <h3 style="margin-top: 0; color: #333; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px;">Thông tin đơn hàng</h3>
        <table style="width: 100%; color: #333; font-size: 14px;">
          <tr><td style="padding: 5px 0;"><strong>Mã đơn hàng:</strong></td><td>${
            order.orderCode
          }</td></tr>
          <tr><td style="padding: 5px 0;"><strong>Trạng thái:</strong></td><td>${
            statusMap[order.status]
          }</td></tr>
          <tr><td style="padding: 5px 0;"><strong>Trạng thái thanh toán:</strong></td><td>${
            PAYMENT_STATUS_MAP[order.paymentStatus]
          }</td></tr>
          ${
            order.deliveryDate
              ? `<tr><td style="padding: 5px 0;"><strong>Ngày giao:</strong></td><td>${new Date(
                  order.deliveryDate
                ).toLocaleDateString("vi-VN")}</td></tr>`
              : ""
          }
          ${
            order.cancelReason
              ? `<tr><td style="padding: 5px 0;"><strong>Lý do hủy:</strong></td><td>${order.cancelReason}</td></tr>`
              : ""
          }
        </table>
      </div>

      <div style="text-align: center; margin-top: 20px; color: #666;">
        <p>Nếu có thắc mắc, vui lòng liên hệ qua email <a href="mailto:binovaweb73@gmail.com" style="color: #4CAF50;">binovaweb73@gmail.com</a></p>
      </div>

      <div style="text-align: right; margin-top: 20px; color: #666;">
        <p>Trân trọng,</p>
        <p><strong>Đội ngũ Binova</strong></p>
      </div>
    </div>
  `;
};

///////// done
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus, reason, cancelReason, userId, review } =
      req.body;

    let deliveryDate = "";

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
      4: [6],
      5: [],
      6: [3, 4],
    };

    // Kiểm tra và cập nhật trạng thái đơn hàng
    if (status !== undefined && status !== order.status) {
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
      if (!order.statusHistory) order.statusHistory = [];
      order.statusHistory.push({
        status,
        updatedByUser: userId || null,
        updatedByType: userId ? "user" : "guest",
        note: cancelReason || reason || null
      });
    }

    // Kiểm tra và cập nhật trạng thái thanh toán
    if (paymentStatus !== undefined && paymentStatus !== order.paymentStatus) {
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
      if (!order.paymentStatusHistory) order.paymentStatusHistory = [];
      order.paymentStatusHistory.push({
        paymentStatus,
        updatedByUser: userId || null,
        updatedByType: userId ? "user" : "guest",
        note: null
      });
    }

    // Cập nhật ngày giao hàng
    if (status === 3) {
      deliveryDate = new Date();
    }
    order.cancelReason = cancelReason || reason || null;

    // Lưu thay đổi
    const updateData = {
      status: order.status,
      paymentStatus: order.paymentStatus,
      cancelReason: order.cancelReason,
      deliveryDate,
    };
    // await Order.findByIdAndUpdate(id, updateData, { new: true });
    // console.log("Order updated status:", order);
    await order.save();

    if (order.status === 4 && order.paymentStatus === 1) {
      try {
        // Cập nhật rank của user
        await handleRankUpdate(order.userId);
        
        // Cập nhật số lượng đã bán của các sản phẩm trong đơn hàng
        for (const item of order.items) {
          try {
            // Tìm và cập nhật số lượng đã bán của sản phẩm
            await Product.updateOne(
              { _id: item.productId },
              { $inc: { selled: item.quantity } }
            );
          } catch (err) {
            console.error(
              `Lỗi khi cập nhật số lượng đã bán cho sản phẩm ${item.productId}:`,
              err.message
            );
          }
        }
      } catch (err) {
        console.error("Lỗi khi cập nhật rank:", err.message);
      }
    }

    // Mapping cho email
    const statusMap = {
      0: "Chờ xác nhận",
      1: "Đã xác nhận",
      2: "Đang giao hàng",
      3: "Đã giao hàng",
      4: "Hoàn thành",
      5: "Đã hủy",
      6: "Hoàn hàng",
    };

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
          user: process.env.EMAIL_USER || "binovaweb73@gmail.com",
          pass: process.env.EMAIL_PASS || "kcjf jurr rjva hqfu",
        },
      });

      await transporter.sendMail({
        from: '"Binova" <binovaweb73@gmail.com>',
        to: order.recipientInfo.email,
        subject: subjectMap[order.status],
        html: createStatusUpdateEmailTemplate(order, statusMap, messageMap),
      });
    } catch (emailError) {
      console.error("Failed to send status update email:", emailError.message);
      // Note: Not throwing error here to avoid failing the status update
    }

    try {
      const user = await authModel.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "Không tìm thấy người dùng" });
      }

      const io = getSocketInstance();
      if (!io) {
        console.error("Socket.IO instance not initialized");
        return res
          .status(500)
          .json({ error: "Hệ thống chưa sẵn sàng để gửi thông báo" });
      }

      const message = `Đơn hàng ${
        order.orderCode
      } đã được cập nhật trạng thái: ${statusMap[order.status]}`;

      // Payload chung cho sự kiện
      const payload = {
        message,
        order: {
          _id: order._id,
          orderCode: order.orderCode,
          status: order.status,
          paymentStatus: order.paymentStatus,
          cancelReason: order.cancelReason,
        },
      };

      // Gửi đến user sở hữu đơn hàng
      console.log(typeof order.userId);

      if (order.userId) {
        const userIdString = order.userId.toString(); // Chuyển ObjectId thành chuỗi
        io.to(userIdString).emit("order-status-changed", payload);
        console.log(
          `Sent notification to user ${userIdString} for order ${order.orderCode}`
        );
      } else {
        console.warn(`Missing userId for order ${order.orderCode}`);
      }

      // Gửi đến tất cả admin
      io.to("admin").emit("order-status-changed", payload);
      console.log(
        `Sent notification to admin-room for order ${order.orderCode}`
      );

      // Nếu user (khách hàng) cập nhật, gửi notify admin
      if (user.role === "user") {
        try {
          await nontifyAdmin(
            1,
            "Cập nhật trạng thái đơn hàng",
            message,
            order._id,
            null
          );
        } catch (notifyError) {
          console.error("Error in nontifyAdmin:", notifyError);
        }
      }

      return res.status(200).json({
        order,
        message: "Cập nhật trạng thái đơn hàng thành công",
      });
    } catch (error) {
      console.error("Lỗi gửi thông báo:", error);
      return res.status(500).json({ error: "Lỗi gửi thông báo" });
    }
  } catch (error) {
    console.error("Lỗi cập nhật đơn hàng:", error);
    return res.status(500).json({
      error: "Lỗi server khi cập nhật đơn hàng",
      details: error.message,
    });
  }
};

//////// done
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
      if (!order.paymentStatusHistory) order.paymentStatusHistory = [];
      order.paymentStatusHistory.push({
        paymentStatus,
        // updatedAt: new Date(),
        updatedByUser: req.body.userId || null,
        updatedByType: req.body.userId ? "user" : "guest",
        note: null
      });
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

//////// done
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
    const cancelableStatus = [0, 1];
    if (!cancelableStatus.includes(order.status)) {
      return res.status(400).json({
        error: `Chỉ được hủy đơn hàng ở trạng thái: ${cancelableStatus
          .map((s) => ORDER_STATUS_MAP[s])
          .join(", ")}`,
      });
    }

    // 5. Cập nhật trạng thái, hoàn hàng và hoàn voucher
    // Đang làm cho đơn COD, nếu là đơn thanh toán online thì cần hoàn tiền về ví và cập nhật trạng thái thanh toán là "Da hoan tien"
    if (order.paymentStatus === 1) {
      // TODO: gọi hàm hoàn tiền qua cổng thanh toán
      order.paymentStatus = 2;
      if (!order.paymentStatusHistory) order.paymentStatusHistory = [];
      order.paymentStatusHistory.push({
        paymentStatus: 2,
        // updatedAt: new Date(),
        updatedByUser: userId || null,
        updatedByType: userId ? "user" : "guest",
        note: null,
      });
    }

    order.status = "5";
    if (!order.orderStatusHistory) order.orderStatusHistory = [];
    order.orderStatusHistory.push({
      status: 5,
      // updatedAt: new Date(),
      updatedByUser: userId || null,
      updatedByType: userId ? "user" : "guest",
      note: null
    });

    for (const item of order.items) {
      await Product.updateOne(
        { "variation._id": item.variationId },
        { $inc: { "variation.$.stock": item.quantity } }
      );
    }

    if (order.voucherCode?.length > 0) {
      await Voucher.updateMany(
        { _id: { $in: order.voucherCode } },
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

//////// done
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
    order.paymentStatusHistory.push({
      paymentStatus: order.paymentStatus,
      updatedByUser: req.user?._id || null,
      updatedByType: req.user ? "user" : "guest",
      note: null,
    });
    order.status = 4;
    order.statusHistory.push({
      status: order.status,
      updatedByUser: req.user?._id || null,
      updatedByType: req.user ? "user" : "guest",
      note: null,
    });
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

export const LookUpOrder = async (req, res) => {
  try {
    const email = req.email;

    if (!email) {
      return res.status(400).json({ error: "Email không hợp lệ" });
    }

    const orders = await Order.find({ "recipientInfo.email": email, $or: [{ userId: { $exists: false } }, { userId: null }] }).populate({
      path: "items.productId",
      select: "name variation",
    });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    }

    const processedOrders = orders.map(order => {
      const processedItems = order.items.map(item => {
        const product = item.productId;

        const matchedVariation = product?.variation?.find(
          v => v._id.toString() === item.variationId.toString()
        );

        return {
          ...item.toObject(),
          variantAttributes: matchedVariation ? matchedVariation.attributes : [],
        };
      });

      const orderObject = order.toObject();
      orderObject.items = processedItems;

      return orderObject;
    });

    return res.status(200).json(processedOrders);
  } catch (error) {
    return res.status(400).json({ error: "Đã xảy ra lỗi khi tìm đơn hàng" });
  }
};

export const updateStatusOrderItem = async (req, res) => {
  try {
    const { id } = req.params;
    const orderId = id;
    const { items } = req.body; // danh sách nhiều item

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    if (!items || items.length === 0) {
      // Nếu không có items được gửi lên, cập nhật tất cả sản phẩm
      order.items.forEach((item) => {
        item.returnStatus = false;
        item.returnQuantity = 0;
      });
    } else {
      // Xử lý danh sách items được gửi lên
      for (const { itemId, returnQuantity } of items) {
        const item = order.items.id(itemId);
        if (!item) {
          return res
            .status(404)
            .json({
              message: `Không tìm thấy sản phẩm ${itemId} trong đơn hàng`,
            });
        }
        if (returnQuantity <= 0 || returnQuantity > item.quantity) {
          return res
            .status(400)
            .json({
              message: `Số lượng hoàn không hợp lệ cho sản phẩm ${itemId}`,
            });
        }

        item.returnStatus = true;
        item.returnQuantity = returnQuantity;
      }
    }

    await order.save();

    return res.status(200).json({
      message: "Tạo yêu cầu hoàn hàng thành công",
      order,
    });
  } catch (error) {
    console.error("Lỗi returnOrder:", error);
    return res
      .status(500)
      .json({ message: "Lỗi server", error: error.message });
  }
};


export const updateReturnOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const orderId = id;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    const refundAmount = order.items.reduce((sum, i) => {
      return sum + (i.returnQuantity * i.priceAtOrder);
    }, 0);

    order.refundAmount = refundAmount - order.discountAmount + 30000;
    // console.log(order.refundAmount);
    order.totalAmount -= order.refundAmount;
    // console.log(order.totalAmount);

    await order.save();

    return res.status(200).json({
      message: "Cập nhật trạng thái hoàn hàng thành công",
      order,
    });
  } catch (error) {
    console.error("Lỗi returnOrder:", error);
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};