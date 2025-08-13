import nodemailer from "nodemailer";

export const sendMail = async ({ to, subject, html }) => {
  try {
      if (!to) {
        console.error("❌ Không có người nhận (to) trong sendMail");
        return;
      }

      console.log("📨 Đang gửi email tới:", to);
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "binovaweb73@gmail.com",
          pass: "kcjf jurr rjva hqfu",        
        },
      });
    
      // Gửi mail
      const info = await transporter.sendMail({
        from: '"Binova Support" <binovaweb73@gmail.com>',
        to,
        subject,
        html,
      });
      console.log("Email đã được gửi thành công", info.response);
  } catch (error) {
      console.error("Lỗi gửi email:", error.message);
  }
 
};