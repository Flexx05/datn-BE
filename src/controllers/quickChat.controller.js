import QuickChat from "../models/quickChat.model";
import { quickChatSchema } from "../validations/quickChat.validation";

export const getAllQuickChat = async (req, res) => {
  try {
    const {
      category,
      search,
      _page = 1,
      _limit = 10,
      _sort = "createdAt",
      _order,
    } = req.query;
    const query = {};
    if (typeof search === "string" && search.trim() !== "") {
      query.content = { $regex: search, $options: "i" };
    }
    if (category !== undefined) {
      const categoryNumber = Number(category);
      if (categoryNumber === 0) {
        query.category = { $in: [1, 2, 3, 4, 5, 6] }; //in : kiểm tra gtri trong mảng
      } else {
        query.category = categoryNumber;
      }
    }

    //Khởi tạo object options để cấu hình truy vấn. Thiết lập populate để lấy thông tin fullName của người tạo 
    // gaiir (createdBy) từ collection liên quan
    const options = {};
    options.populate = {
      path: "createdBy",
      select: "fullName",
    };

    if (_limit === "off") {
      // Khong phan trang, lay tat ca
      options.pagination = false;
    } else {
      options.page = parseInt(_page, 10) || 1; // chuyển đổi chuỗi _page thành số nguyên, nếu không hợp lệ thì mặc định là 1
      // ví dụ: _page = "2", thì options.page = 2. Nếu _page = "abc", thì options.page = 1
      options.limit = parseInt(_limit, 10) || 10; // Giới hạn số QuickChat trả về trong một trang
      options.sort = { [_sort]: _order === "desc" ? -1 : 1 }; //-1 : 1 : sắp xếp tăng dần hoặc giảm dần
    }
    // Sử dụng paginate để lấy danh sách QuickChat theo query(điều kiện tìm kiếm) và options(phân trang,sắp xếp) đã cấu hình
    const chats = await QuickChat.paginate(query, options);
    return res.status(200).json(chats);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getQuickChatById = async (req, res) => {
  try {
    //ID của QuickChat cần truy vấn
    const { id } = req.params;
    const chat = await QuickChat.findById(id)
      .populate({ //populate : lấy thông tin chi tiết từ collection liên quan
        path: "createdBy",
        select: "fullName",
      })
      .populate({
        path: "updatedBy",
        select: "fullName",
      });
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }
    return res.status(200).json(chat);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const createQuickChat = async (req, res) => {
  try {
    const user = req.user;
    const { error, value } = quickChatSchema.validate(req.body, {
      abortEarly: false,
      convert: false,
    });

    if (error) {
      const errors = error.details.map((err) => err.message);
      return res.status(400).json({ error: errors });
    }

    const chat = await QuickChat.create({
      ...value,
      updatedBy: user?._id,
      createdBy: user?._id,
    });

    return res.status(201).json({ error: "Chat created successfully", chat });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateQuickChat = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { error, value } = quickChatSchema.validate(req.body, {
      abortEarly: false,
      convert: false,
    });
    if (error) {
      const errors = error.details.map((err) => err.message);
      return res.status(400).json({ error: errors });
    }
    const chat = await QuickChat.findByIdAndUpdate(
      id,
      { ...value, updatedBy: user?._id },
      { new: true }
    );
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }
    return res.status(200).json({ error: "Chat updated successfully", chat });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const deleteQuickChat = async (req, res) => {
  try {
    const { id } = req.params;
    const chat = await QuickChat.findByIdAndDelete(id);
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }
    return res.status(200).json({ error: "Chat deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
