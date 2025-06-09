import orderModel from "../models/order.model.js";
import { sendOrderStatusEmail } from "../utils/orderMail.js";


// Lấy danh sách đơn hàng (có phân trang và lọc theo trạng thái)
export const getOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;

        const query = {};
         
        // Lọc theo trạng thái nếu có
        if (status) {
            query.status = status;
         }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const orders = await orderModel
            .find(query)

        return res.status(200).json(orders);
    } catch (error) {
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi lấy danh sách đơn hàng",
            error: error.message
        });
    }
};

// Lấy chi tiết đơn hàng
export const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await orderModel
            .findById(id);

        if (!order) {
            return res.status(404).json({
                message: "Không tìm thấy đơn hàng"
            });
        }
  

        return res.status(200).json(order);
    } catch (error) {
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi lấy chi tiết đơn hàng",
            error: error.message
        });
    }
};

// Cập nhật trạng thái đơn hàng (Admin)
export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, deliveryDate } = req.body;


        // Tìm đơn hàng
        const order = await orderModel.findById(id).populate('userId', 'email fullName');

        if (!order) {
            return res.status(404).json({
                message: "Không tìm thấy đơn hàng"
            });
        }

        // Kiểm tra trạng thái hợp lệ
        const validStatuses = ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao hàng', 'Đã giao hàng', 'Đã hủy'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: "Trạng thái đơn hàng không hợp lệ"
            });
        }

        // Cập nhật trạng thái
        order.status = status;
        if (deliveryDate) {
            order.deliveryDate = deliveryDate;
        }

        await order.save();

        // Gửi email thông báo cho khách hàng
        await sendOrderStatusEmail(order.userId.email, {
            orderCode: order.orderCode,
            status: status,
            customerName: order.userId.fullName,
            deliveryDate: order.deliveryDate
        });

        return res.status(200).json({
            message: "Cập nhật trạng thái đơn hàng thành công",
            data: order
        });
    } catch (error) {
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi cập nhật trạng thái đơn hàng",
            error: error.message
        });
    }
};
