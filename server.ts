import "colors";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoute.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";

// Configure env
dotenv.config();

// Database config
connectDB();

const app = express()
  // Middleware
  .use(cors())
  .use(express.json())
  .use(morgan("dev"))
  // Routes
  .use("/api/v1/auth", authRoutes)
  .use("/api/v1/category", categoryRoutes)
  .use("/api/v1/product", productRoutes)
  // REST API
  .get("/", (req, res) => {
    res.send("<h1>Welcome to ecommerce app</h1>");
  });

const PORT = process.env.PORT || 6060;

app.listen(PORT, () => {
  console.log(
    `Server running on ${process.env.DEV_MODE} mode on ${PORT}`.bgCyan.white
  );
});
