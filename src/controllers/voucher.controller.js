import Voucher from "../models/voucher.model.js";
import {
  createVoucherSchema,
  updateVoucherSchema,
} from "../validations/voucher.validation.js";
import dayjs from "dayjs";

//Thêm mới voucher
export const createVoucher = async (req, res) => {
  try {
    // Validate với Joi
    const { error } = createVoucherSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ",
        errors: error.details.map((e) => e.message),
      });
    }

    // Check trùng mã
    const code = req.body.code?.toUpperCase().trim();
    const exists = await Voucher.findOne({
      code: { $regex: `^${code}$`, $options: "i" },
    });
    if (exists) {
      return res.status(400).json({ message: "Mã giảm giá đã tồn tại" });
    }

    const now = new Date();
    const createData = { ...req.body };
    createData.code = code;

    // Xử lý trạng thái
    const startDate = new Date(createData.startDate);
    const endDate = new Date(createData.endDate);

    if (startDate >= endDate) {
      return res.status(400).json({
        message: "Ngày bắt đầu phải trước ngày kết thúc.",
      });
    }

    if (dayjs(startDate).isBefore(dayjs(), "minute")) {
      return res.status(400).json({
        message: "Ngày bắt đầu không được ở quá khứ.",
      });
    }

    if (now > endDate) {
      createData.voucherStatus = "expired";
    } else if (now >= startDate) {
      createData.voucherStatus = "active";
    } else {
      createData.voucherStatus = "inactive";
    }

    // Nếu giảm giá cố định → xóa maxDiscount nếu có
    if (createData.discountType === "fixed") {
      delete createData.maxDiscount;
    }

    if (createData.voucherType === "product") {
      if (
        createData.discountType === "fixed" &&
        createData.minOrderValues <= createData.discountValue
      ) {
        return res.status(400).json({
          message: "Giá trị đơn tối thiểu phải lớn hơn số tiền giảm.",
        });
      }

      if (
        createData.discountType === "percent" &&
        createData.minOrderValues < createData.maxDiscount
      ) {
        return res.status(400).json({
          message:
            "Giá trị đơn tối thiểu phải lớn hơn hoặc bằng mức giảm tối đa.",
        });
      }
    }

    // Xử lý dùng riêng/dùng chung và quantity
    if (Array.isArray(createData.userIds) && createData.userIds.length > 0) {
      // Check trùng lặp trước
      const uniqueUserIds = [...new Set(createData.userIds.map(String))];
      if (uniqueUserIds.length < createData.userIds.length) {
        return res.status(400).json({
          message: "Danh sách userIds có chứa trùng lặp.",
        });
      }

      // Dùng riêng: quantity = số user, không cho nhập quantity từ client
      createData.userIds = uniqueUserIds;
      createData.quantity = createData.userIds.length;
    } else {
      // Dùng chung: quantity lấy từ client, userIds là []
      createData.userIds = [];
      // quantity đã validate ở Joi
    }

    // Tạo voucher mới
    const newVoucher = await Voucher.create({
      ...createData,
    });
    return res.status(200).json({
      message: "Tạo voucher thành công",
      data: newVoucher,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Tạo voucher thất bại",
      error: error.message,
    });
  }
};

//Lấy tất cả voucher
export const getAllVoucher = async (req, res) => {
  try {
    const {
      _page = 1,
      _limit = 10,
      _sort = "createdAt",
      _order,
      code,
      status,
      voucherType,
      isDeleted,
    } = req.query;
    let query = {};

    // Nếu truyền ?isDeleted=true
    if (isDeleted === "true") {
      query.isDeleted = true;
    }
    // Nếu truyền ?isDeleted=false
    else if (isDeleted === "false") {
      query.isDeleted = false;
    }
    // Nếu là all → không thêm gì → sẽ lấy hết tất cả
    // Nếu không truyền gì → mặc định là false
    else if (!isDeleted || isDeleted === "") {
      query.isDeleted = false;
    }

    // Tìm kiếm theo code nếu có
    if (code) {
      query.code = { $regex: code, $options: "i" };
    }
    // Lọc theo status nếu có
    if (status) {
      const allowedStatuses = ["active", "inactive", "expired"];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message:
            "Trạng thái không hợp lệ. Chỉ chấp nhận: active, inactive, expired",
        });
      }
      query.voucherStatus = status;
    }
    //Tìm kiếm voucherType nếu có
    if (voucherType) {
      query.voucherType = { $regex: voucherType, $options: "i" };
    }

    const options = {
      page: parseInt(_page, 10),
      limit: parseInt(_limit, 10),
      sort: { [_sort]: _order === "desc" ? -1 : 1 },
    };

    const listVouchers = await Voucher.paginate(query, options);
    res.status(200).json(listVouchers);
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi lấy danh sách voucher",
      error: error.message,
    });
  }
};

export const getVoucherByCode = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({ message: "Mã voucher là bắt buộc" });
    }

    const voucher = await Voucher.findOne({
      code: code.toUpperCase(),
      isDeleted: false,
    });

    if (!voucher) {
      return res
        .status(404)
        .json({ message: "Voucher không tồn tại hoặc đã bị xoá" });
    }

    res.status(200).json(voucher);
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi tìm voucher theo mã",
      error: error.message,
    });
  }
};

// Lấy chi tiết voucher theo ID
export const getByIdVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id);
    if (!voucher) {
      return res.status(404).json({
        message: "Không tìm thấy voucher",
      });
    }
    res.status(200).json({
      message: "Lấy voucher thành công",
      data: voucher,
    });
  } catch (error) {
    res.status(400).json({
      message: "Lỗi khi lấy voucher",
      error: error.message,
    });
  }
};

// Cập nhật voucher
export const updateVoucher = async (req, res) => {
  try {
    // Validate dữ liệu đầu vào
    const { error } = updateVoucherSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ",
        errors: error.details.map((e) => e.message),
      });
    }

    const code = req.body.code?.toUpperCase().trim();
    const exists = await Voucher.findOne({
      code: { $regex: `^${code}$`, $options: "i" },
      _id: { $ne: req.params.id }, // Loại bỏ voucher đang sửa
    });
    if (exists) {
      return res.status(400).json({ message: "Mã giảm giá đã tồn tại" });
    }

    // Lấy thông tin voucher hiện tại
    const currentVoucher = await Voucher.findById(req.params.id);
    if (!currentVoucher) {
      return res.status(404).json({
        message: "Không tìm thấy voucher để cập nhật",
      });
    }

    if (currentVoucher.isDeleted) {
      return res.status(400).json({
        message: "Voucher đã bị xóa. Không thể cập nhật.",
      });
    }

    if (currentVoucher.voucherStatus === "expired") {
      return res.status(400).json({
        message: "Voucher đã hết hạn. Không thể cập nhật.",
      });
    }

    // ❌ Không cho sửa nếu là voucher tự động
    if (currentVoucher.isAuto) {
      return res.status(403).json({
        message: "Không thể chỉnh sửa voucher được tạo tự động.",
      });
    }

    if (
      currentVoucher.voucherStatus === "active" &&
      req.body.startDate &&
      new Date(req.body.startDate).getTime() !==
        new Date(currentVoucher.startDate).getTime()
    ) {
      return res.status(400).json({
        message: "Không thể thay đổi ngày bắt đầu khi voucher đang hoạt động.",
      });
    }

    const wasPrivate =
      Array.isArray(currentVoucher.userIds) &&
      currentVoucher.userIds.length > 0;
    const isNowShared = !req.body.userIds || req.body.userIds.length === 0;

    if (
      currentVoucher.voucherStatus === "active" &&
      isNowShared &&
      !wasPrivate // chỉ chặn nếu vốn đã là shared
    ) {
      if (req.body.quantity && req.body.quantity < currentVoucher.quantity) {
        return res.status(400).json({
          message:
            "Không thể giảm số lượng voucher công khai khi đang hoạt động.",
        });
      }
    }

    // Chuẩn bị dữ liệu cập nhật
    const updateData = { ...req.body };
    updateData.code = code;
    const now = new Date();

    if (updateData.voucherType === "product") {
      if (
        updateData.discountType === "fixed" &&
        updateData.minOrderValues <= updateData.discountValue
      ) {
        return res.status(400).json({
          message: "Giá trị đơn tối thiểu phải lớn hơn số tiền giảm.",
        });
      }

      if (
        updateData.discountType === "percent" &&
        updateData.minOrderValues < updateData.maxDiscount
      ) {
        return res.status(400).json({
          message:
            "Giá trị đơn tối thiểu phải lớn hơn hoặc bằng mức giảm tối đa.",
        });
      }
    }

    // Tự động cập nhật trạng thái dựa trên ngày
    const startDate = new Date(
      updateData.startDate || currentVoucher.startDate
    );
    const endDate = new Date(updateData.endDate || currentVoucher.endDate);

    if (startDate >= endDate) {
      return res.status(400).json({
        message: "Ngày bắt đầu phải trước ngày kết thúc.",
      });
    }

    // Cập nhật trạng thái dựa trên thời gian hiện tại
    if (now > endDate) {
      updateData.voucherStatus = "expired";
    } else if (now >= startDate && now <= endDate) {
      updateData.voucherStatus = "active";
    } else if (now < endDate) {
      updateData.voucherStatus = "inactive";
    }

    // ✅ Check trùng lặp userIds trước khi set quantity
    if (Array.isArray(updateData.userIds) && updateData.userIds.length > 0) {
      const uniqueUserIds = [...new Set(updateData.userIds.map(String))];
      if (uniqueUserIds.length < updateData.userIds.length) {
        return res.status(400).json({
          message: "Danh sách userIds có chứa trùng lặp.",
        });
      }

      // Dùng riêng: quantity = số user
      updateData.userIds = uniqueUserIds;
      updateData.quantity = updateData.userIds.length;
    } else {
      // Dùng chung
      updateData.userIds = [];
    }

    // Cập nhật voucher
    const updatedVoucher = await Voucher.findOneAndUpdate(
      { _id: req.params.id },
      updateData,
      { new: true, runValidators: true }
    );
    return res.status(200).json({
      message: "Cập nhật voucher thành công",
      data: updatedVoucher,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Cập nhật voucher thất bại",
      error: error.message,
    });
  }
};

// Xoá voucher
export const deleteVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id);

    if (!voucher) {
      return res.status(404).json({
        message: "Voucher không tồn tại, vui lòng kiểm tra lại.",
      });
    }

    // Nếu là voucher tự động → chỉ cho xoá mềm
    if (voucher.isAuto) {
      if (!voucher.isDeleted) {
        voucher.isDeleted = true;
        await voucher.save();
        return res.status(200).json({
          message: "Voucher tự động đã được chuyển vào thùng rác (xóa mềm).",
        });
      } else {
        return res.status(400).json({
          message:
            "Voucher tự động chỉ có thể xóa mềm, không thể xóa vĩnh viễn.",
        });
      }
    }

    // Nếu là voucher thường thì cho xóa mềm và xóa vĩnh viễn
    if (!voucher.isDeleted) {
      // Xóa mềm
      voucher.isDeleted = true;
      await voucher.save();
      return res.status(200).json({
        message: "Đã chuyển voucher vào thùng rác (xóa mềm).",
      });
    } else {
      // Xóa vĩnh viễn
      await Voucher.findByIdAndDelete(req.params.id);
      return res.status(200).json({
        message: "Đã xóa vĩnh viễn voucher.",
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Đã xảy ra lỗi. Vui lòng thử lại sau.",
      error: error.message,
    });
  }
};

// Khôi phục voucher từ thùng rác
export const restoreVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id);

    if (!voucher) {
      return res.status(404).json({
        message: "Voucher không tồn tại, vui lòng kiểm tra lại.",
      });
    }

    if (!voucher.isDeleted) {
      return res.status(400).json({
        message: "Voucher chưa bị xóa.",
      });
    }

    // Khôi phục voucher (đánh dấu isDeleted = false)
    voucher.isDeleted = false;
    await voucher.save();

    return res.status(200).json({
      message: "Khôi phục voucher thành công.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Đã xảy ra lỗi. Vui lòng thử lại sau.",
      error: error.message,
    });
  }
};

// Lấy danh sách voucher của người dùng
export const getUserVouchers = async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.user?._id || null;

    const visibilityCondition = userId
      ? [{ userIds: { $size: 0 } }, { userIds: { $in: [userId] } }]
      : [{ userIds: { $size: 0 } }];

    const baseQuery = {
      isDeleted: false,
      voucherStatus: "active",
      $or: visibilityCondition,
    };

    if (q?.trim()) {
      const keyword = q.trim();
      baseQuery.$and = [
        {
          $or: [
            { code: { $regex: keyword, $options: "i" } },
            { description: { $regex: keyword, $options: "i" } },
          ],
        },
      ];
    }

    const vouchers = await Voucher.find(baseQuery).sort({ endDate: 1 });

    const result = vouchers.map((voucher) => ({
      _id: voucher._id,
      code: voucher.code,
      userIds: voucher.userIds,
      description: voucher.description,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      maxDiscount: voucher.maxDiscount || null,
      minOrderValues: voucher.minOrderValues,
      startDate: voucher.startDate,
      endDate: voucher.endDate,
      voucherType: voucher.voucherType,
      quantity: voucher.quantity,
      used: voucher.used,
      status: voucher.voucherStatus,
    }));

    return res.status(200).json({
      message: userId
        ? "Danh sách voucher khi đã đăng nhập"
        : "Danh sách voucher khi chưa đăng nhập",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi khi lấy danh sách voucher",
      error: error.message,
    });
  }
};
