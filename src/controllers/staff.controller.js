import authModel from "../models/auth.model";

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
    const query = {};

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
    console.error("Get Staff Error:", error);
    return res.status(400).json({
      message: error.message,
    });
  }
};

export const updateStaffRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["admin", "staff"].includes(role)) {
      return res.status(400).json({
        message: "Vai trò không hợp lệ. Vai trò phải là 'admin' hoặc 'staff'",
      });
    }

    const user = await authModel.findById(id);
    if (!user) {
      return res.status(404).json({
        message: "Không tìm thấy người dùng",
      });
    }

    if (id === req.user._id.toString()) {
      return res.status(400).json({
        message: "Không thể thay đổi vai trò của chính mình",
      });
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
      message: "Cập nhật vai trò thất bại",
      error: error.message,
    });
  }
};
