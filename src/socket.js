import { Server } from "socket.io";
import authModel from "./models/auth.model";

let ioInstance;

export function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:5174"],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  ioInstance = io;
  io.on("connection", (socket) => {
    console.log("A client connected: " + socket.id);

    // Nontification for admin
    socket.on("join-admin-room", () => {
      socket.join("admin");
      console.log("Admin joined room");
    });

    socket.on("join-room", (userId) => {
      socket.join(userId);
      console.log("User joined room");
    });

    // Handle chat messages
    // socket.on("chat-message", async ({ senderId, reciverId, message }) => {
    //   if (!senderId || !reciverId || !message) return;
    //   try {
    //     const newChatMessage = await ChatMessage.create({
    //       senderId,
    //       reciverId,
    //       message,
    //     });
    //     io.to(reciverId).emit("newChatMessage", newChatMessage);
    //     io.to(senderId).emit("newChatMessage", newChatMessage);
    //   } catch (error) {
    //     console.error("Error handling chat message:", error.message);
    //     socket.emit("chat-message-error", {
    //       error: "Lỗi khi gửi tin nhắn",
    //     });
    //   }
    // });

    // Check account status
    socket.on("check-account-status", async (userId) => {
      socket.join(userId);
      try {
        const user = await authModel.findById(userId);
        socket.emit("account-status", {
          userId,
          isActive: user?.isActive ?? false,
        });
      } catch (error) {
        socket.emit("account-status", {
          userId,
          isActive: false,
          error: "Không tìm thấy tài khoản",
        });
      }
    });
    socket.on("disconnect", () => {
      console.log("A client disconnected: " + socket.id);
    });
  });
  return io;
}

export function getSocketInstance() {
  return ioInstance;
}
