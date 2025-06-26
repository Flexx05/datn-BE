import nontificationModel from "../models/nontification.model";
import { getSocketInstance } from "../socket";

export const nontifyAdmin = async (type, content, orderId = null) => {
  const nontification = await nontificationModel.create({
    type,
    content,
    orderId,
    receiver: "admin",
  });
  const io = getSocketInstance();
  io.to("admin").emit("new-nontification", nontification);
};

// Khi đặt hàng thành công
// await notifyAdmin("order", "Khách hàng vừa đặt một đơn hàng mới", newOrder._id);

// Khi cập nhật trạng thái đơn hàng
// await notifyAdmin("status", `Đơn hàng ${id} đã được cập nhật trạng thái`, id);

export const getAllNontification = async (req, res) => {
  try {
    const nontifications = await nontificationModel.find();
    return res.status(200).json(nontifications);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
