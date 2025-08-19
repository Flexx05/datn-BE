import bcrypt from "bcryptjs";
import authModel from "../models/auth.model";
import { getSocketInstance } from "../socket";
import { updateUserInfoSchema } from "../validations/auth.validation";
import Order from "../models/order.model";
import { sendMail } from "../utils/sendMail";
import Conversation from "../models/conversation.model";

export const getAllUsers = async (req, res) => {
  try {
    const {
      search,
      isActive,
      _page = 1,
      _limit = 10,
      _sort = "createdAt",
      _order,
    } = req.query;

    const query = { role: "user" };

    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const options = {};

    if (_limit === "off") {
      options.pagination = false;
    } else {
      options.page = parseInt(_page, 10);
      options.limit = parseInt(_limit, 10);
      options.sort = { [_sort]: _order === "desc" ? -1 : 1 };
    }

    const users = await authModel.paginate(query, options);

    if (options.pagination === false) {
      return res.status(200).json({ docs: users });
    } else {
      return res.status(200).json(users);
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách người dùng",
      error: error.message,
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await authModel.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({
        error: "Không tìm thấy người dùng",
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin người dùng",
      error: error.message,
    });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { isActive, reason } = req.body;
    if (isActive === undefined || typeof isActive !== "boolean") {
      return res.status(400).json({
        error:
          "Trạng thái không hợp lệ, vui lòng cung cấp isActive là true hoặc false",
      });
    }

    if (user.role !== "user" && user._id.toString() === id) {
      return res.status(400).json({
        error: "Không thể cập nhật trạng thái cho chính mình.",
      });
    }

    const updatedUser = await authModel.findById(id).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        error: "Không tìm thấy người dùng",
      });
    }

    if (user.role === "user") {
      if (user._id.toString() !== id) {
        return res.status(403).json({
          error: "Bạn chỉ có thể cập nhật tài khoản của chính mình.",
        });
      }
    }

    if (user.role === "staff") {
      if (updatedUser.role !== "user") {
        return res.status(403).json({
          error: "Bạn không có quyền thực hiện hành động này",
        });
      }
    }

    updatedUser.isActive = isActive;
    if (updatedUser.role === "admin") {
      updatedUser.role = "staff";
    } else if (updatedUser.role === "staff") {
      const conversationAssign = await Conversation.find({
        assignedTo: id,
      });
      for (const conversation of conversationAssign) {
        conversation.assignedTo = null;
        await conversation.save();
      }
    }

    await updatedUser.save();

    if (!isActive) {
      const io = getSocketInstance();
      const userId = updatedUser._id.toString();
      io.to(userId).emit("account-status", {
        userId,
        isActive: false,
        error: "Tài khoản đã bị khóa",
      });

      if (reason && updatedUser.email) {
        const subject = "Tài khoản của bạn đã bị khóa";
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #f5222d;">Tài khoản của bạn đã bị khóa</h2>
            <p>Xin chào <strong>${
              updatedUser.fullName || updatedUser.email
            }</strong>,</p>
            <p>Tài khoản của bạn đã bị khóa bởi quản trị viên với lý do sau:</p>
            <div style="background: #fffbe6; border-left: 4px solid #faad14; padding: 12px 16px; margin: 16px 0;">
              <b>Lý do:</b> ${reason}
            </div>
            <p>Nếu bạn có thắc mắc hoặc cần hỗ trợ, vui lòng liên hệ với chúng tôi để được giải đáp.</p>
            <div style="text-align: right; margin-top: 40px;">
              <p>Trân trọng,</p>
              <i><strong>Đội ngũ Binova</strong></i>
            </div>
          </div>
        `;
        try {
          await sendMail({ to: updatedUser.email, subject, html });
        } catch (mailErr) {
          console.error("Lỗi gửi email khóa tài khoản:", mailErr);
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: updatedUser,
      message: `Người dùng đã được ${
        isActive ? "kích hoạt" : "vô hiệu hóa"
      } thành công`,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật trạng thái người dùng",
      error: error.message,
    });
  }
};

export const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { passwordOld, passwordNew } = req.body;

    const trimpasswordOld =
      typeof passwordOld === "string" ? passwordOld.trim() : "";
    const trimpasswordNew =
      typeof passwordNew === "string" ? passwordNew.trim() : "";

    if (!trimpasswordOld || !trimpasswordNew) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu cũ và mật khẩu mới là bắt buộc",
      });
    }

    if (trimpasswordNew.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 8 ký tự",
      });
    }

    const user = await authModel.findOne({ _id: id });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    const isValid = await bcrypt.compare(trimpasswordOld, user.password);
    if (!isValid) {
      return res
        .status(400)
        .json({ success: false, message: "Sai mật khẩu cũ" });
    }

    if (trimpasswordOld === trimpasswordNew) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới không được trùng với mật khẩu cũ",
      });
    }

    const hashedPassword = await bcrypt.hash(trimpasswordNew, 10);
    user.password = hashedPassword;
    await user.save();

    console.log(`User ${id} đã đổi mật khẩu thành công lúc ${new Date()}`);

    return res.status(200).json({
      success: true,
      message: "Đặt lại mật khẩu thành công",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi khi đặt lại mật khẩu",
      error: error.message,
    });
  }
};

export const updateUserInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateUserInfoSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { fullName, phone, address, avatar } = value;

    const updatedUser = await authModel.findByIdAndUpdate(
      id,
      {
        fullName,
        phone: phone || null,
        address: address || null,
        avatar: avatar || null,
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    return res.status(200).json({
      success: true,
      data: updatedUser,
      message: "Cập nhật thông tin người dùng thành công",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật thông tin người dùng",
      error: error.message,
    });
  }
};
