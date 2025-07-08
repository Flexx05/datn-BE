import ChatMessage from "../models/chatMessage.model";

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
    console.error("Error fetching chat messages by user ID:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserMessages = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user._id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const chatMessages = await ChatMessage.find({
      $or: [{ senderId: user._id }, { reciverId: user._id }],
    })
      .populate("senderId", "name email")
      .sort({ createdAt: -1 });
    return res.status(200).json(chatMessages);
  } catch (error) {
    console.error("Error fetching user messages:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

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
