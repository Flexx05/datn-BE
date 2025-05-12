import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRouter from "./routers/auth.router";
import cartRouter from "./routers/cart.router";

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());
app.use(cookieParser());


mongoose.connect(`mongodb://127.0.0.1:27017/demo`);

app.use("/api", authRouter);
app.use("/api", cartRouter)
export const viteNodeApp = app;