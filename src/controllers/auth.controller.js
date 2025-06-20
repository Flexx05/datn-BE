import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import otpGenerator from "otp-generator";
import authModel from "../models/auth.model";
import otpModel from "../models/otp.model";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from "../validations/auth.validation";

const sendEmail = async (email) => {
  await otpModel.findOneAndDelete({ email });

  const OTP = otpGenerator.generate(6, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });
  console.log(OTP);

  const hashOTP = await bcrypt.hash(OTP, 10);

  await otpModel.create({
    email,
    otp: hashOTP,
    dueDate: Date.now() + 3 * 60 * 1000,
  });

  //sendEmail
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "binovaweb73@gmail.com",
      pass: "kcjf jurr rjva hqfu",
    },
  });

  await transporter.sendMail({
    from: "Bạn hãy kiểm tra email của mình để xác thực tài khoản",
    to: email,
    subject: "Xác thực tài khoản",
    text: `Mã xác thực của bạn là ${OTP}`,
  });
};

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

    const { email } = value;
    const userExist = await authModel.findOne({ email });
    if (userExist) {
      return res.status(400).json({ error: "User already exists" });
    }
    sendEmail(email);
    const hashPassword = await bcrypt.hash(value.password, 10);
    const user = await authModel.create({
      ...value,
      password: hashPassword,
      isActive: false,
      isVerify: false,
    });

    return res.status(200).json({ message: "OTP đã được gửi đi", user });
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

    const { email, otp } = value;

    const record = await otpModel.findOne({ email });

    if (!record) {
      return res.status(400).json({ error: "No OTP found for this email" });
    }

    const isValid = await bcrypt.compare(otp, record.otp);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid OTP" });
    }
    const newUser = await authModel.findOneAndUpdate(
      { email },
      { isActive: true, isVerify: true },
      { new: true }
    );

    if (!newUser) {
      return res.status(404).json({ error: "User not found" });
    }

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
    const { email, password } = value;
    const user = await authModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Email không tồn tại" });
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({ error: "Sai mật khẩu" });
    }
    if (!user.isActive || user.isActive === false) {
      sendEmail(email);
      return res
        .status(400)
        .json({ error: "OTP đã được gửi! Vui lòng kiểm tra email" });
    }
    if (!user.isVerify || user.isVerify === false) {
      return res.status(400).json({ error: "Vui lòng kiểm tra email" });
    }

    const accessToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET_KEY || "binova",
      {
        expiresIn: "1d",
      }
    );
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET || "refresh_binova",
      {
        expiresIn: "7d",
      }
    );
    user.refreshToken = refreshToken;
    await user.save();
    user.password = undefined; // Không trả về mật khẩu trong response
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    return res
      .status(200)
      .json({ message: "Đăng nhập thành công", user, accessToken });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const refreshToken = async (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token không hợp lệ" });
  }
  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || "refresh_binova"
    );
    const user = await authModel.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ error: "Refresh token không hợp lệ" });
    }
    const newAccessToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET_KEY || "binova",
      {
        expiresIn: "1d",
      }
    );
    return res.status(200).json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    return res.status(403).json({ error: error.message });
  }
};

export const loginGoogle = async (req, res) => {
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

export const forgotPassword = async (req, res) => {
  try {
    const { error } = forgotPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { email } = req.body;

    const user = await authModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email không tồn tại trong hệ thống",
      });
    }
    sendEmail(email);
    return res.status(200).json({
      success: true,
      message: "Mã xác thực đã được gửi đến email của bạn",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi gửi mã xác thực",
      error: error.message,
    });
  }
};

export const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpRecord = await otpModel.findOne({ email });
    if (!otpRecord) {
      return res
        .status(400)
        .json({ success: false, message: "Không tìm thấy OTP" });
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otp);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "OTP không đúng" });
    }

    const user = await authModel.findOne({ email });
    user.resetPasswordVerified = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Xác thực OTP thành công",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const user = await authModel.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Người dùng không tồn tại" });
    }

    if (!user.resetPasswordVerified) {
      return res
        .status(403)
        .json({ success: false, message: "Bạn cần xác thực OTP trước" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordVerified = false;
    await user.save();

    await otpModel.deleteOne({ email });
    return res.status(200).json({
      success: true,
      message: "Đặt lại mật khẩu thành công",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
