import nodemailer from "nodemailer";

export const sendMail = async ({ to, subject, html }) => {
  try {
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