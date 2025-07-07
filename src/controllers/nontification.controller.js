import nontificationModel from "../models/nontification.model";
import { getSocketInstance } from "../socket";

export const nontifyAdmin = async (
  type,
  userName,
  orderStatus,
  orderCode,
  orderId
) => {
  const nontification = await nontificationModel.create({
    type,
    userName,
    orderCode,
    orderStatus,
    orderId,
    receiver: "admin",
  });
  const io = getSocketInstance();
  io.to("admin").emit("new-nontification", nontification);
  io.to("admin").emit("order-list-updated");
};

export const getAllNontification = async (req, res) => {
  try {
    const { _sort = "createdAt", _order = "desc" } = req.query;
    const sortOption = {};
    sortOption[_sort] = _order.toLowerCase() === "asc" ? 1 : -1;
    const nontifications = await nontificationModel.find().sort(sortOption);
    return res.status(200).json(nontifications);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteNontification = async (req, res) => {
  try {
    const { id } = req.params;
    const nontification = await nontificationModel.findByIdAndDelete(id);
    return res.status(200).json(nontification);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const changeReadingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const nontification = await nontificationModel.findByIdAndUpdate(
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
