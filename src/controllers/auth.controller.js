import { OAuth2Client } from "google-auth-library";
import otpGenerator from "otp-generator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import authModel from "../models/auth.model";
import otpModel from "../models/otp.model";
import { loginGoogleSchema, loginSchema, verifyOtpSchema } from "../validations/auth.validation";

export const register = async (req, res) => {
  try {

    const { error, value } = registerSchema.validate(req.body, {
          abortEarly: false,
          convert: false,
        });
        if (error) {
          const errors = error.details.map((err) => err.message);
          return res.status(400).json({ message: errors });
        }

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


export const verifyOtp = async (req, res) => {
  try {

    const { error, value } = verifyOtpSchema.validate(req.body, {
          abortEarly: false,
          convert: false,
        });
        if (error) {
          const errors = error.details.map((err) => err.message);
          return res.status(400).json({ message: errors });
        }

    const { email, otp, password } = req.body;

    const record = await otpModel.findOne({ email });

    if (!record) {
      return res.status(400).json({ error: "No OTP found for this email" });
    }

    const isValid = await bcrypt.compare(otp, record.otp);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid OTP" });
    }
    const hashPassword = await bcrypt.hash(password, 10);
    const newUser = await authModel.create({ email, password: hashPassword , fullName,phone, address, avatar, role, activeStatus});

    // Xoá OTP đã dùng
    await otpModel.deleteOne({ email });

    return res
      .status(201)
      .json({ message: "User registered successfully", newUser });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body, {
      abortEarly: false,
      convert: false,
    });
    if (error) {
      const errors = error.details.map((err) => err.message);
      return res.status(400).json({ message: errors });
    }

    const { email, password } = req.body;
    const user = await authModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Email không tồn tại" });
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({ error: "Sai mật khẩu" });
    }
    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY || "secret", {
      expiresIn: "1d",
    });
    return res.status(200).json({ message: "Đăng nhập thành công", user, accessToken });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};


export const loginGoogle = async (req, res) => {

  const { error, value } = loginGoogleSchema.validate(req.body, {
        abortEarly: false,
        convert: false,
      });
      if (error) {
        const errors = error.details.map((err) => err.message);
        return res.status(400).json({ message: errors });
      }

  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  const { token } = req.body;
  try {
    // Xác thực token
    const ticket = await client.verifyIdToken({
      idToken: token,
      requiredAudience: process.env.GOOGLE_CLIENT_ID,
    });
   
    const payload = ticket.getPayload();

    const { email, name } = payload;
   
    // Kiểm tra xem người dùng đã tồn tại chưa
    let user = await authModel.findOne({ email });
    if (!user) {
      // Nếu chưa tồn tại, tạo người dùng mới
      user = await authModel.create({ email, name, password: null });
    }
    const accessToken = jwt.sign({ id: user.id }, "chutrang", {
      expiresIn: "5m",
    });
    return res.status(200).json({ user, accessToken });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};











