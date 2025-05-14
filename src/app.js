import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routers/auth.router";
import brandRouter from "./routers/brand.router";
import attributeRouter from "./routers/attribute.router";
import productRouter from "./routers/product.router";
import userRouter from "./routers/admin.user.router";
import voucherRouter from "./routers/voucher.router"

const app = express();

dotenv.config();

app.use(cors());
app.use(express.json());

mongoose.connect(`mongodb://127.0.0.1:27017/${process.env.DB_URL}`);

//router
app.use("/api", attributeRouter);
app.use("/api", productRouter);
app.use("/api", authRouter);
app.use("/api/brand", brandRouter);
app.use("/api", userRouter);
app.use("/api",voucherRouter)

export const viteNodeApp = app;