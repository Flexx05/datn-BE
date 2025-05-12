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

app.use("/api", authRouter);
export const viteNodeApp = app;