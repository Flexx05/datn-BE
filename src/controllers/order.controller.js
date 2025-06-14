import Order from "../models/order.model.js";
import Voucher from "../models/voucher.model.js";
import Product from "../models/product.model.js";
import { generateOrderCode } from "../services/order.service.js";
import mongoose from "mongoose";
import nodemailer from "nodemailer";

export const createOrder = async (req, res) => {
    try {
        const { voucherCode = [], shippingAddress, items, shippingFee, paymentMethod } = req.body;

        const userId = req.user.id;
        const voucherIds = [];

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "Đơn hàng phải có ít nhất một sản phẩm" });
        }

        if (paymentMethod === "COD") {
            const variationIds = items.map((i) => i.variationId);
            const products = await Product.find({ "variation._id": { $in: variationIds } });
            const orderItems = [];

            for (const item of items) {
                // 1. Tìm product chứa variation
                const product = products.find((p) => p.variation.some((v) => v._id.toString() === item.variationId));

                if (!product) {
                    return res.status(404).json({ error: `Không tìm thấy sản phẩm chứa biến thể ${item.variationId}` });
                }

                // 2. Lấy biến thể
                const variation = product.variation.id(item.variationId);
                if (!variation) {
                    return res.status(404).json({ error: `Không tìm thấy biến thể ${item.variationId}` });
                }

                // 3. Kiểm tra số lượng
                if (item.quantity <= 0) {
                    return res.status(400).json({ error: "Số lượng phải lớn hơn 0" });
                }

                if (item.quantity > variation.stock) {
                    return res.status(400).json({
                        error: `Số lượng sản phẩm ${product.name} trong kho chỉ còn ${variation.stock}`,
                    });
                }

                // 4. Tính giá bán (giảm giá nếu nằm trong thời gian sale)
                const now = new Date();
                let price = variation.regularPrice;

                if (new Date(variation.saleFrom) <= now && now <= new Date(variation.saleTo)) {
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

            const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);

            let hasShippingVoucher = false;
            let shippingFeeValue = shippingFee || 100000;
            let discountAmount = 0;

            const uniqueVoucher = new Set(voucherCode);
            if (uniqueVoucher.size !== voucherCode.length) {
                return res.status(400).json({ error: "Không được sử dụng voucher giống nhau trong cùng một đơn hàng" });
            }

            for (const code of voucherCode) {
                const voucher = await Voucher.findOne({ code });

                if (!voucher) {
                    return res.status(400).json({ error: "Voucher không tồn tại" });
                }

                voucherIds.push(voucher._id);

                const now = new Date();

                if (
                    !voucher ||
                    voucher.voucherStatus === "inactive" ||
                    voucher.voucherStatus === "expired" ||
                    now < new Date(voucher.startDate) ||
                    now > new Date(voucher.endDate)
                ) {
                    return res.status(400).json({ error: `Voucher ${voucher.code} không hợp lệ hoặc đã hết hạn` });
                }

                if (voucher.used >= voucher.quantity) {
                    return res.status(400).json({ error: `Voucher ${voucher.code} đã hết lượt sử dụng` });
                }

                if (voucher.minOrderValues > subtotal) {
                    return res.status(400).json({
                        error: `Đơn hàng tối thiểu để sử dụng voucher ${voucher.code} là ${voucher.minOrderValues}`,
                    });
                }

                if (voucher.voucherType === "product") {
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
                        return res
                            .status(400)
                            .json({ error: "Chỉ được sử dụng 1 voucher giảm phí vận chuyển mỗi đơn hàng." });
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

            if (shippingFeeValue < 0) shippingFeeValue = 0;

            const totalAmount = subtotal + shippingFeeValue - discountAmount;
            const orderCode = generateOrderCode();
            const order = new Order({
                userId,
                orderCode,
                voucherId: voucherIds,
                shippingAddress,
                items: orderItems,
                subtotal,
                shippingFee: shippingFeeValue,
                discountAmount,
                totalAmount,
                status: "Chờ xử lý",
                paymentStatus: "Chưa thanh toán",
                paymentMethod,
                deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            });

            const orderSave = await order.save();
            console.log("Order saved:", orderSave);

            if (orderSave) {
                if (orderSave.voucherId?.length) {
                    await Voucher.updateMany({ _id: { $in: orderSave.voucherId } }, { $inc: { used: 1 } });
                }

                for (const item of orderSave.items) {
                    await Product.updateOne(
                        { "variation._id": item.variationId },
                        { $inc: { "variation.$.stock": -item.quantity } }
                    );
                }

                const transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        user: "binovaweb73@gmail.com",
                        pass: "kcjf jurr rjva hqfu",
                    },
                });

                await transporter.sendMail({
                    from: '"Binova" <binovaweb73@gmail.com>',
                    to: req.user.email,
                    subject: `Xác nhận đơn hàng ${orderSave.orderCode}`,
                    html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #4CAF50; text-align: center">🎉 Đặt hàng thành công!</h2>
                    <p>Xin chào <strong>${orderSave.name || "Quý khách"}</strong>,</p>
                    <p>Chúng tôi đã nhận được đơn hàng <strong>${orderSave.orderCode}</strong> của bạn.</p>
                    
                    <h3>📦 Thông tin đơn hàng:</h3>
                    <ul>
                        <li><strong>Mã đơn hàng:</strong> ${orderSave.orderCode}</li>
                        <li><strong>Trạng thái:</strong> ${orderSave.status}</li>
                        <li><strong>Phương thức thanh toán:</strong> ${orderSave.paymentMethod}</li>
                        <li><strong>Trạng thái thanh toán:</strong> ${orderSave.paymentStatus}</li>
                        <li><strong>Ngày giao dự kiến:</strong> ${new Date(orderSave.deliveryDate).toLocaleDateString(
                            "vi-VN"
                        )}</li>
                    </ul>

                    <h3>📍 Địa chỉ giao hàng:</h3>
                    <p>${orderSave.shippingAddress.address}, ${orderSave.shippingAddress.city}, ${
                        orderSave.shippingAddress.country
                    }</p>

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
                            <td style="text-align: right;">${item.priceAtOrder.toLocaleString("vi-VN")} VNĐ</td>
                            <td style="text-align: right;">${item.totalPrice.toLocaleString("vi-VN")} VNĐ</td>
                            </tr>
                        `
                            )
                            .join("")}
                        </tbody>
                    </table>

                    <h3>💰 Tóm tắt thanh toán:</h3>
                    <ul>
                        <li><strong>Tạm tính:</strong> ${orderSave.subtotal.toLocaleString("vi-VN")} VNĐ</li>
                        <li><strong>Phí vận chuyển:</strong> ${orderSave.shippingFee.toLocaleString("vi-VN")} VNĐ</li>
                        <li><strong>Giảm giá:</strong> ${orderSave.discountAmount.toLocaleString("vi-VN")} VNĐ</li>
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

                return res.status(201).json({
                    message: "Đơn hàng đã được tạo thành công",
                    order: orderSave,
                });
            }
        }
    } catch (error) {
        return res.status(400).json({ error: error.message });
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
    const userIdFromToken = req.user.id;
    const userRole = req.user.role;

    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
        }

        const isAdminOrStaff = userRole === "admin" || userRole === "staff";

        console.log("User ID from token:", userIdFromToken);
        console.log("Order User ID:", order.userId.toString());

        if (!isAdminOrStaff && order.userId.toString() !== userIdFromToken) {
            return res.status(403).json({ error: "Bạn không có quyền truy cập đơn hàng này" });
        }

        return res.status(200).json(order);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};

export const getOrderByUserId = async (req, res) => {
    try {
        const userId = req.user.id;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: "ID người dùng không hợp lệ" });
        }

        const orders = await Order.find({ userId }).sort({ createdAt: -1 });
        if (!orders || orders.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy đơn hàng cho người dùng này" });
        }

        return res.status(200).json(orders);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};

export const getOrderByUserIdForAdminOrStaff = async (req, res) => {
    const {userId} = req.params;

    if(!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: "ID người dùng không hợp lệ" });
    }

    try {
        const orders = await Order.find({ userId}).sort({createdAt: -1});
        return res.status(200).json(orders);
    }catch (error) {
        return res.status(400).json({ error: error.message });
    }
}

export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, paymentStatus, deliveryDate } = req.body;

        const allowedFields = ["status", "paymentStatus", "deliveryDate"];
        const unknownFields = Object.keys(req.body).filter((key) => !allowedFields.includes(key));
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

        const isSame =
            order.status === status &&
            order.paymentStatus === paymentStatus &&
            new Date(order.deliveryDate).getTime() === new Date(deliveryDate).getTime();

        if (isSame) {
            return res.status(400).json({ error: "Không có thay đổi để cập nhật" });
        }

        const validStatusTransitions = {
          "Cho xac nhan": ["Da xac nhan", "Dang giao hang", "Da huy"],
          "Dang giao hang": ["Da giao hang", "Da huy"],
          "Da giao hang": [],
          "Da huy": [],
        };

        if (status && status !== order.status) {
            const allowedNextStatuses = validStatusTransitions[order.status];
            if (!allowedNextStatuses.includes(status)) {
                return res.status(400).json({
                    error: `Không thể chuyển trạng thái từ "${order.status}" sang "${status}"`,
                });
            }
            order.status = status;
        }

        if (paymentStatus && paymentStatus !== order.paymentStatus) {
            const validPaymentTransitions = {
                "Chua thanh toan": ["Da thanh toan", "That bai"],
                "That bai": [],
                "Da thanh toan": ["Da hoan tien"],
                "Da hoan tien": [],
            };

            const allowedNext = validPaymentTransitions[order.paymentStatus];
            if (!allowedNext.includes(paymentStatus)) {
                return res.status(400).json({
                    error: `Không thể chuyển trạng thái thanh toán từ "${order.paymentStatus}" sang "${paymentStatus}"`,
                });
            }

            order.paymentStatus = paymentStatus;
        }

        if (deliveryDate) {
            order.deliveryDate = new Date(deliveryDate);
        }

        await order.save();
        return res.status(200).json({ message: "Cập nhật trạng thái thành công", order });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
