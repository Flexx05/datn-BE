import notificationModel from "../models/nontification.model";
import { getSocketInstance } from "../socket";

export const nontifyAdmin = async (type, title, message, link) => {
  const nontification = await notificationModel.create({
    type,
    title,
    message,
    link,
  });
  const io = getSocketInstance();
  io.to("admin").emit("new-nontification", nontification);
  io.to("admin").emit("notification-updated");
  io.to("admin").emit("conversation-updated");
};

export const getAllNontification = async (req, res) => {
  try {
    const { _sort = "createdAt", _order = "desc", link } = req.query;
    const filter = {};
    if (typeof link === "string" && link.trim() !== "") {
      filter.link = { $regex: link, $options: "i" };
    }
    const sortOption = {};
    sortOption[_sort] = _order.toLowerCase() === "asc" ? 1 : -1;
    const nontifications = await notificationModel
      .find(filter)
      .sort(sortOption);
    return res.status(200).json(nontifications);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteNontification = async (req, res) => {
  try {
    const { id } = req.params;
    const nontification = await notificationModel.findByIdAndDelete(id);
    return res.status(200).json(nontification);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const changeReadingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const nontification = await notificationModel.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );
    if (!nontification)
      return res.status(404).json({ message: "Thông báo không tồn tại" });
    return res.status(200).json(nontification);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
