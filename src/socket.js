import { Server } from "socket.io";

export function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:5174"],
      methods: ["GET", "POST"],
    },
  });
  io.on("connection", (socket) => {
    console.log("A client connected: " + socket.id);
    // Thêm các sự kiện realtime tại đây nếu cần
  });
  return io;
}
