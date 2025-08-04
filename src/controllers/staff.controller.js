import authModel from "../models/auth.model";
import Conversation from "../models/conversation.model";
import { sendMail } from "../utils/sendMail";

export const getAllStaff = async (req, res) => {
  try {
    const {
      search,
      isActive,
      _page = 1,
      _limit = 10,
      _sort = "createdAt",
      _order,
      role,
    } = req.query;
    const query = { role: { $in: ["admin", "staff"] } };

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

    if (role) {
      query.role = role;
    }
    const options = {};

    if (_limit === "off") {
      options.pagination = false;
    } else {
      options.page = parseInt(_page, 10) || 1;
      options.limit = parseInt(_limit, 10) || 10;
      options.sort = { [_sort]: _order === "desc" ? -1 : 1 };
    }

    const staffs = await authModel.paginate(query, options);

    return res.status(200).json(staffs);
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }
};

export const getOneStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await authModel.findById(id);
    if (!staff) {
      return res.status(404).json({
        error: "Không tìm thấy người dùng",
      });
    }
    return res.status(200).json(staff);
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }
};

export const updateStaffRole = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { role } = req.body;

    if (!["admin", "staff", "user"].includes(role)) {
      return res.status(400).json({
        error: "Vai trò không hợp lệ.",
      });
    }

    const staff = await authModel.findById(id);
    if (!staff) {
      return res.status(404).json({
        error: "Không tìm thấy người dùng",
      });
    }

    if (["staff", "admin"].includes(role) && staff.role === "user") {
      await Conversation.findOneAndUpdate(
        {
          "participants.userId": id,
          status: { $ne: "closed" },
        },
        { $set: { status: "closed" } },
        { new: true }
      );
    }

    if (staff.isVerify && staff.isVerify === false)
      return res.status(400).json({ error: "Tài khoản chưa xác thực" });

    if (staff.isActive === false)
      return res.status(400).json({ error: "Tài khoản bị khoá" });

    if (id === user._id.toString()) {
      return res.status(400).json({
        error: "Không thể thay đổi vai trò của chính mình",
      });
    }

    const roleMapping = {
      admin: "Quản trị viên",
      staff: "Nhân viên",
      user: "Khách hàng",
    };

    const roleAuthenticationMapping = {
      admin: `
      <li>Quản lý sản phẩm</li>
      <li>Quản lý danh mục</li>
      <li>Quản lý thương hiệu</li>
      <li>Quản lý thuộc tính</li>
      <li>Quản lý người dùng</li>
      <li>Quản lý theo dõi thống kê</li>
      <li>Và một số quyền khác của người quản trị</li>
      `,
      staff: `
      <li>Quản lý đơn hàng</li>
      <li>Nhắn tin với khách hàng</li>
      <li>Và một số quyền khác của người nhân viên</li>
      `,
    };

    if (staff.email) {
      const subject = "Cập nhật vai trò người dùng";
      const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #61f522ff;">Tài khoản của bạn đã được cập nhật vai trò</h2>
            <p>Xin chào <strong>${staff.fullName || staff.email}</strong>,</p>
            <p>Chào mừng bạn gia nhập đội ngũ Binova.</p>
            <p>Tài khoản của bạn đã được cập nhật với vai trò ${
              roleMapping[role]
            }</p>
            ${
              roleAuthenticationMapping[role]
                ? `
                <p>Với vai trò trên bạn có quyền:</p>
                <ul>${roleAuthenticationMapping[role]}</ul>
                  `
                : ""
            }
            <p>Nếu bạn có thắc mắc hoặc cần hỗ trợ, vui lòng liên hệ với chúng tôi để được giải đáp.</p>
            <div style="text-align: right; margin-top: 40px;">
              <p>Trân trọng,</p>
              <i><strong>Đội ngũ Binova</strong></i>
            </div>
          </div>
      `;
      await sendMail({ to: staff.email, subject, html });
    }

    const updatedUser = await authModel
      .findByIdAndUpdate(
        id,
        { $set: { role } },
        {
          new: true,
          runValidators: false,
        }
      )
      .select("-password");

    return res.status(200).json({
      message: "Cập nhật vai trò thành công",
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    console.error("Update Role Error:", error);
    return res.status(400).json({
      error: error.message,
    });
  }
};
