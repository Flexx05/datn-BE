import ChatMessage from "../models/chatMessage.model";
import { getSocketInstance } from "../socket";

export const getAllChatMessages = async (req, res) => {
  try {
    const chatMessages = await ChatMessage.find()
      .populate("senderId", "name email")
      .sort({ createdAt: -1 });
    return res.status(200).json(chatMessages);
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getChatMessagesByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const chatMessages = await ChatMessage.find({
      $or: [{ senderId: userId }, { reciverId: userId }],
    })
      .populate("senderId", "name email")
      .sort({ createdAt: -1 });
    return res.status(200).json(chatMessages);
  } catch (error) {
    console.error("Error fetching chat messages by user ID:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// export const updateChatMessage = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { read } = req.body;
//     if (read === undefined) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }
//     const updatedChatMessage = await ChatMessage.findByIdAndUpdate(
//       id,
//       { read },
//       { new: true }
//     );
//     if (!updatedChatMessage) {
//       return res.status(404).json({ error: "Chat message not found" });
//     }
//     return res.status(200).json(updatedChatMessage);
//   } catch (error) {
//     console.error("Error updating chat message:", error);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// };

export const deleteChatMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedChatMessage = await ChatMessage.findByIdAndDelete(id);
    if (!deletedChatMessage) {
      return res.status(404).json({ error: "Chat message not found" });
    }
    return res
      .status(200)
      .json({ message: "Chat message deleted successfully" });
  } catch (error) {
    console.error("Error deleting chat message:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
