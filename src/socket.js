import { Server } from "socket.io";

let ioInstance = null; // Thêm biến này

export function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:5174"],
      methods: ["GET", "POST"],
    },
  });
  ioInstance = io; // Lưu lại instance
  io.on("connection", (socket) => {
    console.log("A client connected: " + socket.id);
    // Thêm các sự kiện realtime tại đây nếu cần
  });
  return io;
}

// Thêm hàm này để lấy io ở nơi khác
export function getIO() {
  return ioInstance;
}