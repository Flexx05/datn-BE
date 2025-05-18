import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routers/auth.router";
// import brandRouter from "./routers/brand.router";
import attributeRouter from "./routers/attribute.router";
import categoryRouter from "./routers/category.router";
const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());

mongoose.connect(
    `mongodb+srv://root:binova2025@datn-db.nx9ha3d.mongodb.net/${process.env.DB_URL}?authSource=admin&retryWrites=true&w=majority&appName=DATN-DB`
);

//router
app.use("/api", attributeRouter);
app.use("/api", authRouter);
app.use("/api/category", categoryRouter );


export const viteNodeApp = app;
