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

    // Nontification
    socket.on("join-admin-room", () => {
      socket.join("admin");
      console.log("Admin joined room");
    });

    // change order status
    socket.on("join-room", (userId) => {
      socket.join(userId);
      console.log("User joined room");
    });

    // const io = getSocketInstance();
    // const message = `Đơn hàng ${mã đơn hàng}` đã được khách hàng ${trạng thái đơn hàng}`
    // io.to(updatedOrder.userId.toString()).emit("order-status-changed", message);

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
