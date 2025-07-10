import nodemailer from 'nodemailer';

// Cấu hình transporter cho nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: "binovaweb73@gmail.com",
        pass: "kcjf jurr rjva hqfu",    
    }
});

// Hàm gửi email thông báo trạng thái đơn hàng
export const sendOrderStatusEmail = async (toEmail, orderInfo) => {
    const { orderCode, status, customerName, deliveryDate } = orderInfo;

    // Tạo nội dung email dựa trên trạng thái
    let subject = `Cập nhật trạng thái đơn hàng ${orderCode}`;
    let content = `Xin chào ${customerName},\n\n`;

    switch (status) {
        case 'Chờ xác nhận':
            content += `Đơn hàng ${orderCode} của bạn đã được tiếp nhận và đang chờ xử lý.`;
            break;
        case 'Đã xác nhận':
            content += `Đơn hàng ${orderCode} của bạn đã được xác nhận và chuẩn bị được giao đến bạn.`;
            break;
        case 'Đang giao hàng':
            content += `Đơn hàng ${orderCode} của bạn đang được giao đến bạn.\n`;
            if (deliveryDate) {
                content += `Dự kiến giao hàng vào: ${new Date(deliveryDate).toLocaleDateString('vi-VN')}`;
            }
            break;
        case 'Đã giao hàng':
            content += `Đơn hàng ${orderCode} đã được giao thành công. Cảm ơn bạn đã mua hàng!`;
            break;
        case 'Đã hủy':
            content += `Đơn hàng ${orderCode} đã bị hủy. Nếu bạn có thắc mắc, vui lòng liên hệ với chúng tôi để được hỗ trợ.`;
            break;
        default:
            content += `Trạng thái đơn hàng ${orderCode} của bạn đã được cập nhật thành: ${status}`;
    }

    content += '\n\nTrân trọng,\nĐội ngũ hỗ trợ khách hàng';
    console.log('Email content:', content);
    // Cấu hình email
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: toEmail,
        subject: subject,
        text: content
    };

    // Gửi email
    try {
        await transporter.sendMail(mailOptions);
        console.log(`Đã gửi email thông báo trạng thái đơn hàng ${orderCode} đến ${toEmail}`);
    } catch (error) {
        console.error('Lỗi khi gửi email:', error);
        throw error;
    }
}; 