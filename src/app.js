import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import authRouter from "./routers/auth.router";
import categoryRouter from "./routers/category.router";
import cartRouter from "./routers/cart.router";
import brandRouter from "./routers/brand.router";
import attributeRouter from "./routers/attribute.router";
import productRouter from "./routers/product.router";
import userRouter from "./routers/admin.user.router";
import voucherRouter from "./routers/voucher.router";
import staffRrouter from "./routers/staff.router";
import paymentRouter from "./routers/payment.router";
import orderRouter from "./routers/order.router";

const app = express();

dotenv.config();

const corsOptions = {
  origin: (origin, callback) => {
    callback(null, origin);
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

mongoose.connect(
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@datn-db.nx9ha3d.mongodb.net/${process.env.DB_URL}?retryWrites=true&w=majority&appName=DATN-DB`
);
console.log("Connected to MongoDB");

//route
app.use("/api", attributeRouter);
app.use("/api", productRouter);
app.use("/api", authRouter);
app.use("/api", categoryRouter);
app.use("/api", cartRouter);
app.use("/api", brandRouter);
app.use("/api", userRouter);
app.use("/api", voucherRouter);
app.use("/api", staffRrouter);
app.use("/api", paymentRouter);
app.use("/api", orderRouter);

export const viteNodeApp = app;
