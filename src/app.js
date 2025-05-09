import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

const app = express();
dotenv.config();

// middleware
app.use(cors());
app.use(express.json());

// Connect DB
mongoose.connect(`mongodb://localhost:27017/${process.env.DB_URL}`);

//router

export const viteNodeApp = app;
