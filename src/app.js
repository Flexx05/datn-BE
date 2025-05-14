import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routers/auth.router";

const app = express();

dotenv.config();

app.use(cors());
app.use(express.json());

mongoose.connect(`mongodb://127.0.0.1:27017/demo`);

//router
app.use("/api", attributeRouter);
app.use("/api", productRouter);
app.use("/api", authRouter);
app.use("/api/brand", brandRouter);

export const viteNodeApp = app;
