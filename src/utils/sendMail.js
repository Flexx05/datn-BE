import nodemailer from "nodemailer";

export const sendMail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "phambao2132005@gmail.com",
          pass: "jsvd vtnm kygr spge",        
        },
      });
    
      // Gửi mail
      const info = await transporter.sendMail({
        from: '"Binova Support" <phambao2132005@gmail.com>',
        to,
        subject,
        html,
      });
      console.log("Email đã được gửi thành công", info.response);
  } catch (error) {
      console.error("Lỗi gửi email:", messageerror.message);
  }
 
};