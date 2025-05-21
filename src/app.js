import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import authRouter from "./routers/auth.router";
import cartRouter from "./routers/cart.router";
import brandRouter from "./routers/brand.router";
import attributeRouter from "./routers/attribute.router";
import productRouter from "./routers/product.router";
import userRouter from "./routers/admin.user.router";
import voucherRouter from "./routers/voucher.router";
import paymentRouter from "./routers/payment.router";

const app = express();

dotenv.config();

app.use(cors());
app.use(express.json());
app.use(cookieParser());


mongoose.connect(`mongodb://127.0.0.1:27017/${process.env.DB_URL}`);

//route
app.use("/api", attributeRouter);
app.use("/api", productRouter);
app.use("/api", authRouter);
app.use("/api", cartRouter);
app.use("/api/brand", brandRouter);
app.use("/api", userRouter);
app.use("/api", voucherRouter);
app.use("/api", paymentRouter);

export const viteNodeApp = app;


