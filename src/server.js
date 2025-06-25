import { createServer } from "vite";
import { setupSocket } from "./socket"; // nơi khởi tạo socket.io

async function startServer() {
  const vite = await createServer();
  await vite.listen();

  const httpServer = vite.httpServer;
  if (!httpServer) {
    console.error("❌ Không lấy được httpServer từ Vite.");
    return;
  }
  setupSocket(httpServer); // gắn socket tại đây

  console.log("✅ Server + Socket.IO đã chạy!");
}

startServer();
