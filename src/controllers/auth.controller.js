import { OAuth2Client } from "google-auth-library";
import otpGenerator from "otp-generator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import authModel from "../models/auth.model";
import otpModel from "../models/otp.model";

export const register = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await authModel.findOne({ email , password });
    if (user) {
      return res.status(400).json({ error: "User already exists" });
    }
    await otpModel.findOneAndDelete({ email });

    const OTP = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });
    console.log(OTP);

    const hashOTP = await bcrypt.hash(OTP, 10);

    await otpModel.create({ email, otp: hashOTP });

    //sendEmail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "mlinhalone@gmail.com",
        pass: "kqpo zlxp lfld furi",
      },
    });

    await transporter.sendMail({
      from: "Bạn hãy kiểm tra email của mình để xác thực tài khoản",
      to: email,
      subject: "Xác thực tài khoản",
      text: `Mã xác thực của bạn là ${OTP}`,
    });

    return res.status(200).json({ message: "OTP đã được gửi đi" });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

