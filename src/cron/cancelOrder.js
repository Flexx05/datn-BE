// Tự động hủy đơn khi chọn thanh toán online nhưng không thanh toán
import cron from "node-cron";
import Order from "../models/order.model";
import { sendMail } from "../utils/sendMail";
import productModel from "../models/product.model";

export const startCancelOrderJob = () => {
  cron.schedule("*/5 * * * *", async () => {
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    try {
      const orderNotPayedByOnline = await Order.find({
        paymentMethod: { $eq: "VNPAY" },
        paymentStatus: { $eq: 0 }, // Chưa thanh toán
        createdAt: { $lte: fifteenMinutesAgo }, // Đơn hàng đã tạo hơn 15 phút
      });
      // Xử lý hủy đơn hàng
      for (const order of orderNotPayedByOnline) {
        order.status = 5; // Cập nhật trạng thái thành "Đã hủy"
        order.paymentStatus = 3; // Cập nhật trạng thái thanh toán thành "Đã hủy"
        order.completedBy = "system"; // Đánh dấu là hệ thống hủy
        order.cancelReason = "Hủy tự động do không thanh toán sau 15 phút"; // Lý do hủy
        // Cập nhật lại số lượng sản phẩm trong kho
        for (const item of order.items) {
          // Tăng lại số lượng kho
          await productModel.updateOne(
            { "variation._id": item.variationId },
            { $inc: { "variation.$.stock": item.quantity } }
          );
          // Kiểm tra và cập nhật inStock nếu đang là false
          await productModel.updateOne(
            {
              _id: item.productId,
              inStock: false,
            },
            { $set: { inStock: true } }
          );
        }

        await order.save();
        // Gửi email thông báo
        await sendMail({
          to: order.recipientInfo.email,
          subject: `Binova - Thông báo đơn hàng ${order.orderCode} được hủy`,
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
                            Chúng tôi xin thông báo rằng đơn hàng <strong>#${order.orderCode}</strong> của Quý khách đã được hủy tự động do không thực hiện thanh toán trong vòng 15 phút kể từ khi tạo đơn.
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
          </html>`,
        });
      }
      if (orderNotPayedByOnline.length > 0) {
        console.log(
          `[${now.toLocaleString()}] Cron hủy đơn hàng: ${
            orderNotPayedByOnline.length
          } đơn hàng đã hủy do không thanh toán sau 15 phút`
        );
      }
    } catch (error) {
      console.error("[CRON] Lỗi cron khi hủy đơn", error.message);
    }
  });
};
