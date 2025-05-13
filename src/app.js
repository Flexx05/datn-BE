import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import attributeRouter from "./routers/attribute.router";
import productRouter from "./routers/product.router";

const app = express();
dotenv.config();

// middleware
app.use(cors());
app.use(express.json());

// Connect DB
mongoose.connect(`mongodb://localhost:27017/${process.env.DB_URL}`);

//router
app.use("/api", attributeRouter);
app.use("/api", productRouter);

export const viteNodeApp = app;
