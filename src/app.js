import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routers/auth.router";
import commentRouter from "./routers/comment.router";

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());

mongoose.connect(
    `mongodb+srv://root:binova2025@datn-db.nx9ha3d.mongodb.net/${process.env.DB_URL}?retryWrites=true&w=majority&appName=DATN-DB    
`);
console.log("Connected to MongooseDb");


app.use("/api", authRouter);
app.use("/api", commentRouter);
export const viteNodeApp = app;