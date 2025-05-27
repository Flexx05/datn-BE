import Voucher from "../models/voucher.model.js"
import {
  createVoucherSchema,
  updateVoucherSchema
} from "../validations/voucher.validation.js";


//Thêm mới voucher
export const createVoucher = async (req, res) => {
  try {
    const { error } = createVoucherSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ",
        errors: error.details.map((e) => e.message),
      });
    }
    const exists = await Voucher.findOne({ code: req.body.code });
    if (exists) {
      return res.status(400).json({ message: "Mã giảm giá đã tồn tại" });
    }

    // Chuẩn bị dữ liệu cập nhật
    const createData = { ...req.body };
    const now = new Date();

    // Tự động cập nhật trạng thái dựa trên ngày
    const startDate = new Date(createData.startDate);
    const endDate = new Date(createData.endDate);

    // Cập nhật trạng thái dựa trên thời gian hiện tại
    if (now > endDate) {
      createData.voucherStatus = "expired";
    } else if (now >= startDate && now <= endDate) {
      createData.voucherStatus = "active";
    } else if (now < endDate) {
      createData.voucherStatus = "inactive";
    }
    //Thêm mới
    const newVoucher = await Voucher.create(createData);
    res.status(200).json({
      message: "Tạo voucher thành công",
      data: newVoucher
    })
  } catch (error) {
    res.status(400).json({
      message: "Tạo voucher thất bại",
      error: error.message,
    });
  }
}

//Lấy tất cả voucher
export const getAllVoucher = async (req, res) => {
  try {
    const { code, status, voucherType } = req.query;
    let query = {};
    // Tìm kiếm theo code nếu có
    if (code) {
      query.code = { $regex: code, $options: "i" };
    }
    // Lọc theo status nếu có
    if (status) {
      const allowedStatuses = ["active", "inactive", "expired"];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Trạng thái không hợp lệ. Chỉ chấp nhận: active, inactive, expired",
        });
      }
      query.voucherStatus = status;
    }
    //Tìm kiếm voucherType nếu có
    if(voucherType){
      query.voucherType = { $regex: voucherType, $options: "i" };
    }
    const listVouchers = await Voucher.find(query);
    res.status(200).json({
      message: "Lấy danh sách voucher thành công",
      data: listVouchers,
    })
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi lấy danh sách voucher",
      error: error.message,
    });
  }
}

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
    const { error } = updateVoucherSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ",
        errors: error.details.map((e) => e.message),
      });
    }
    // Lấy thông tin voucher hiện tại
    const currentVoucher = await Voucher.findById(req.params.id);
    if (!currentVoucher) {
      return res.status(404).json({
        message: "Không tìm thấy voucher để cập nhật",
      });
    }
    // Chuẩn bị dữ liệu cập nhật
    const updateData = { ...req.body };
    const now = new Date();

    // Tự động cập nhật trạng thái dựa trên ngày
    const startDate = new Date(updateData.startDate || currentVoucher.startDate);
    const endDate = new Date(updateData.endDate || currentVoucher.endDate);

    // Cập nhật trạng thái dựa trên thời gian hiện tại
    if (now > endDate) {
      updateData.voucherStatus = "expired";
    } else if (now >= startDate && now <= endDate) {
      updateData.voucherStatus = "active";
    } else if (now < endDate) {
      updateData.voucherStatus = "inactive";
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
    const deletedVoucher = await Voucher.findByIdAndDelete(req.params.id);
    if (!deletedVoucher) {
      return res.status(404).json({
        message: "Không tìm thấy voucher để xoá",
      });
    }
    res.status(200).json({
      message: "Xoá voucher thành công",
      data: deletedVoucher,
    });
  } catch (error) {
    res.status(400).json({
      message: "Xoá voucher thất bại",
      error: error.message,
    });
  }
};




