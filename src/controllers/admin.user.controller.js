import authModel from "../models/auth.model";
import bcrypt from "bcryptjs";
import { updateUserInfoSchema } from "../validations/auth.validation";

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
    const options = {
      page: parseInt(_page, 10),
      limit: parseInt(_limit, 10),
      sort: { [_sort]: _order === "desc" ? -1 : 1 },
    };

    const users = await authModel.paginate(query, options);

    return res.status(200).json(users);
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
        success: false,
        message: "Không tìm thấy người dùng",
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
    const { isActive } = req.body;

    if (isActive === undefined || typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message:
          "Trạng thái không hợp lệ, vui lòng cung cấp isActive là true hoặc false",
      });
    }

    const updatedUser = await authModel
      .findByIdAndUpdate(id, { isActive }, { new: true })
      .select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    return res.status(200).json({
      success: true,
      data: updatedUser,
      message: `Người dùng đã được ${
        isActive ? "kích hoạt" : "vô hiệu hóa"
      } thành công`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật trạng thái người dùng",
      error: error.message,
    });
  }
};

export const updateUserActiveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { activeStatus } = req.body;

    if (activeStatus === undefined || typeof activeStatus !== "boolean") {
      return res.status(400).json({
        success: false,
        message:
          "Trạng thái không hợp lệ, vui lòng cung cấp activeStatus là true hoặc false",
      });
    }

    const updatedUser = await authModel
      .findByIdAndUpdate(id, { activeStatus }, { new: true })
      .select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    return res.status(200).json({
      success: true,
      data: updatedUser,
      message: `Trạng thái hoạt động của người dùng đã được cập nhật thành ${
        activeStatus ? "online" : "offline"
      }`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật trạng thái hoạt động của người dùng",
      error: error.message,
    });
  }
};

export const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { passwordOld, passwordNew } = req.body;
      
    const trimpasswordOld = typeof passwordOld === 'string' ? passwordOld.trim() : '';
    const trimpasswordNew = typeof passwordNew === 'string' ? passwordNew.trim() : '';

    if (!trimpasswordOld || !trimpasswordNew) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu cũ và mật khẩu mới là bắt buộc",
      });
    }
    if(trimpasswordNew.length < 8) {
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
  
        // kiểm tra tránh trùng lặp mật khẩu mới và cũ
    if (trimpasswordOld === trimpasswordNew) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới không được trùng với mật khẩu cũ",
      });
    }

     const hashedPassword = await bcrypt.hash(trimpasswordNew, 10);
      user.password = hashedPassword;
       await user.save(); 

    const isValid = await bcrypt.compare(trimpasswordOld, user.password);
    if (!isValid) {
      return res.status(400).json({ success: false, message: "Sai mật khẩu cũ" });
    }

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
    const { fullName, phone, address } = value;
    const updatedBy = req.user?.id || null;
    const userUpdated = await authModel.findById(updatedBy).select("fullName");
    if (!userUpdated) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng đã cập nhật",
      });
    }

    const updatedUser = await authModel.findByIdAndUpdate(
      id,
      {
        fullName,
        phone: phone || null,
        address: address || null,
        updatedBy,
        userUpdated: userUpdated.fullName,
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
