import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRouter from "./routers/auth.router";
import cartRouter from "./routers/cart.router";
import brandRouter from "./routers/brand.router";
import attributeRouter from "./routers/attribute.router";

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());
app.use(cookieParser());


mongoose.connect(`mongodb://127.0.0.1:27017/demo`);

//router
app.use("/api", attributeRouter);
app.use("/api", authRouter);
app.use("/api", cartRouter);
app.use("/api/brand", brandRouter);
export const viteNodeApp = app;


