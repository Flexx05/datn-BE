import cron from "node-cron";
import Order from "../models/order.model";
import { sendMail } from "../utils/sendMail";
export const startChangeOrderStatusJob = () => {
  cron.schedule("*/30 * * * *", async () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      const deliveriedOrders = await Order.find({
        status: { $eq: 3 }, // Trạng thái đã giao hàng
        paymentStatus: { $eq: 1 }, // Trạng thái đã thanh toán
        deliveryDate: { $lte: oneHourAgo },
      });
      // Cập nhật trạng thái đơn hàng đã giao
      for (const order of deliveriedOrders) {
        order.status = 4; // Cập nhật trạng thái thành "Đã hoàn thành"
        order.completedBy = "system"; // Đánh dấu là hệ thống hoàn thành
        await order.save();
        // Gửi email thông báo
        await sendMail({
          to: order.recipientInfo.email,
          subject: `Binova - Thông báo đơn hàng ${order.orderCode} đã hoàn thành`,
          html: `
          <html lang="vi">
            <body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
                <tr>
                  <td align="center" style="padding:24px 12px;">
                    <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);border-collapse:collapse;">
                      <!-- Header -->
                      <tr>
                        <td style="padding:20px 24px;background-color:#0d47a1;color:#ffffff;">
                          <h1 style="margin:0;font-size:18px;font-weight:600;color:#ffffff;">Binova</h1>
                        </td>
                      </tr>
                      <!-- Body -->
                      <tr>
                        <td style="padding:24px;">
                          <p style="margin:0 0 16px 0;color:#333333;font-size:15px;">
                            Kính gửi Quý khách <strong>${order.recipientInfo.name}</strong>,
                          </p>
                          <p style="margin:0 0 16px 0;color:#333333;font-size:15px;line-height:1.5;">
                            Chúng tôi trân trọng thông báo rằng đơn hàng <strong>#${order.orderCode}</strong> của Quý khách đã được giao thành công. 
                            Do Quý khách chưa thực hiện thao tác xác nhận hoàn tất giao nhận, hệ thống đã tiến hành 
                            <strong>tự động cập nhật trạng thái đơn hàng sang “Hoàn thành”</strong> nhằm hoàn tất quy trình xử lý và lưu trữ hồ sơ giao dịch.
                          </p>
                          <p style="margin:0 0 16px 0;color:#333333;font-size:15px;line-height:1.5;">
                            Nếu Quý khách cho rằng trạng thái trên chưa phản ánh chính xác thực tế hoặc cần hỗ trợ thêm, xin vui lòng liên hệ với chúng tôi trong vòng 
                            <strong>7</strong> ngày kể từ ngày nhận được thông báo này qua:
                          </p>
                          <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 20px 0;border-collapse:collapse;">
                            <tr>
                              <td style="vertical-align:top;padding-right:12px;">
                                <strong style="display:block;color:#333333;font-size:14px;">Email:</strong>
                                <a href="mailto:binovaweb73@gmail.com" style="color:#0d47a1;text-decoration:none;font-size:14px;">binovaweb73@gmail.com</a>
                              </td>
                            </tr>
                          </table>
                          <p style="margin:0 0 18px 0;color:#666666;font-size:13px;line-height:1.5;">
                            Quý khách cũng có thể truy cập mục “Đơn hàng của tôi” trên website để xem chi tiết và gửi yêu cầu hỗ trợ.
                          </p>
                          <p style="margin:0 0 6px 0;color:#333333;font-size:15px;">
                            Chúng tôi chân thành cảm ơn Quý khách đã tin tưởng và lựa chọn <strong>Binova</strong>.
                          </p>
                          <p style="margin:18px 0 0 0;color:#333333;font-size:15px;">Trân trọng,</p>
                          <p style="margin:6px 0 0 0;color:#333333;font-size:14px;">
                            Bộ phận Chăm sóc Khách hàng — <span style="color:#333333;">Binova</span><br>
                          </p>
                        </td>
                      </tr>
                      <!-- Footer -->
                      <tr>
                        <td style="padding:16px 24px;background-color:#fafbfd;color:#888888;font-size:12px;text-align:center;">
                          © <span>2025</span> Binova. Bảo lưu mọi quyền.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
          `,
        });
      }
      if (deliveriedOrders.length > 0) {
        console.log(
          `[${now.toLocaleString()}] Cron cập nhật trạng thái đơn hàng: ${
            deliveriedOrders.length
          } đơn hàng đã giao => hoàn thành`
        );
      }
    } catch (error) {
      console.error(
        "[CRON] Lỗi khi thay đổi trạng thái đơn hàng:",
        error.message
      );
    }
  });
};
