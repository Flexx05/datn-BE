import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routers/auth.router";
import brandRouter from "./routers/brand.router";
import attributeRouter from "./routers/attribute.router";
import productRouter from "./routers/product.router";

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());

mongoose.connect(
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@datn-db.nx9ha3d.mongodb.net/${process.env.DB_URL}?retryWrites=true&w=majority&appName=DATN-DB`
);
console.log("Connected to MongoDB");

//router
app.use("/api", attributeRouter);
app.use("/api", productRouter);
app.use("/api", authRouter);
app.use("/api/brand", brandRouter);

export const viteNodeApp = app;
