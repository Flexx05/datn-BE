import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import userRouter from "./routers/admin.user.router";
import attributeRouter from "./routers/attribute.router";
import authRouter from "./routers/auth.router";
import brandRouter from "./routers/brand.router";
import cartRouter from "./routers/cart.router";
import categoryRouter from "./routers/category.router";
import commentRouter from "./routers/comment.router";
import orderRouter from "./routers/order.router";
import paymentRouter from "./routers/payment.router";
import productRouter from "./routers/product.router";
import staffRrouter from "./routers/staff.router";
import voucherRouter from "./routers/voucher.router";
import { createServer } from "http";
import { setupSocket } from "./socket";
import nontificationRouter from "./routers/nontification.router";
import statisticsRouter from "./routers/statistics.router";
import { startVoucherStatusJob } from "./cron/voucherStatusCron.js";
import nontificationRouter from "./routers/nontification.router";
import walletRouter from "./routers/wallet.router.js";
import returnRequestRouter from "./routers/returnRequest.router.js";
import conversationRouter from "./routers/conversation.router";
import orderStatisticsRouter from "./routers/order-statistics.router.js";
import rankRouter from "./routers/rank.router.js";

const app = express();
const httpServer = createServer(app);
setupSocket(httpServer);

dotenv.config();

const corsOptions = {
  origin: (origin, callback) => {
    callback(null, origin);
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@datn-db.nx9ha3d.mongodb.net/${process.env.DB_URL}?retryWrites=true&w=majority&appName=DATN-DB`
  )
  .then(() => {
    console.log("Connected to MongoDB");

    // 👉 Khởi động cron job cập nhật trạng thái voucher
    startVoucherStatusJob();
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
  });

//route
app.use("/api", attributeRouter);
app.use("/api", productRouter);
app.use("/api", authRouter);
app.use("/api", commentRouter);
app.use("/api", categoryRouter);
app.use("/api", cartRouter);
app.use("/api", brandRouter);
app.use("/api", userRouter);
app.use("/api", voucherRouter);
app.use("/api", staffRrouter);
app.use("/api", paymentRouter);
app.use("/api", orderRouter);
app.use("/api", nontificationRouter);
app.use("/api", statisticsRouter);
app.use("/api", walletRouter);
app.use("/api", returnRequestRouter);
app.use("/api", conversationRouter);
app.use("/api", orderStatisticsRouter);
app.use("/api", rankRouter);

httpServer.listen(process.env.PORT || 8080, () => {
  console.log(
    `Server listening on: http://localhost:${process.env.PORT || 8080}`
  );
});

export const viteNodeApp = app;
