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
        query.category = { $in: [1, 2, 3, 4, 5, 6] };
      } else {
        query.category = categoryNumber;
      }
    }
    const options = {};
    options.populate = {
      path: "createdBy",
      select: "fullName",
    };

    if (_limit === "off") {
      // Khong phan trang, lay tat ca
      options.pagination = false;
    } else {
      options.page = parseInt(_page, 10) || 1;
      options.limit = parseInt(_limit, 10) || 10;
      options.sort = { [_sort]: _order === "desc" ? -1 : 1 };
    }
    const chats = await QuickChat.paginate(query, options);
    return res.status(200).json(chats);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getQuickChatById = async (req, res) => {
  try {
    const { id } = req.params;
    const chat = await QuickChat.findById(id)
      .populate({
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
