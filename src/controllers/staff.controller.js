import authModel from "../models/auth.model";

export const getAllStaff = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
      search = "",
      status,
    } = req.query;

    const query = {
      role: "staff",
    };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const staffs = await authModel
      .find(query)
      .sort({ [sortBy]: order === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("-password");

    const total = await authModel.countDocuments(query);

    return res.status(200).json({
      message: "Lấy danh sách nhân viên thành công",
      data: {
        staffs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get Staff Error:", error);
    return res.status(400).json({
      message: error.message,
    });
  }
};

