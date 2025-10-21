import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/db";
import Category from "../models/categoryModel";
import Order, { StatusEnum } from "../models/orderModel";
import Product from "../models/productModel";
import User from "../models/userModel";

import fs from "fs";
import path from "path";

import bcrypt from "bcrypt";

const photoPath = path.join(__dirname, "assets", "product.png");
const photoData = fs.readFileSync(photoPath);

async function resetDatabase() {
  try {
    dotenv.config();
    await connectDB();

    console.log("Connected to MongoDB");

    // Clear Database
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
    ]);

    console.log("Cleared collections");

    // Generate Password
    const hashedPassword = await bcrypt.hash("Password", 10);

    // Reseed Data
    const users = await User.insertMany([
      {
        name: "Alice Tan",
        email: "alice@example.com",
        password: hashedPassword,
        phone: "0123456789",
        address: "Kuala Lumpur, Malaysia",
        answer: "blue",
        role: 1,
      },
      {
        name: "Bob Lim",
        email: "bob@example.com",
        password: hashedPassword,
        phone: "0192233445",
        address: "Penang, Malaysia",
        answer: "green",
        role: 1,
      },
      {
        name: "Charlie Lee",
        email: "charlie@example.com",
        password: hashedPassword,
        phone: "0179988776",
        address: "Johor Bahru, Malaysia",
        answer: "red",
        role: 0,
      },
    ]);

    const categories = await Category.insertMany([
      { name: "Electronics", slug: "electronics" },
      { name: "Books", slug: "books" },
      { name: "Fashion", slug: "fashion" },
    ]);

    const products = await Product.insertMany([
      {
        name: "Smartphone X",
        slug: "smartphone-x",
        description: "High-end smartphone with 128GB storage",
        price: 2999,
        category: categories[0]._id,
        quantity: 10,
        photo: { data: photoData, contentType: "image/png" },
        shipping: true,
      },
      {
        name: "Wireless Headphones",
        slug: "wireless-headphones",
        description: "Noise-cancelling over-ear headphones",
        price: 899,
        category: categories[0]._id,
        quantity: 25,
        photo: { data: photoData, contentType: "image/png" },
        shipping: true,
      },
      {
        name: "Casual T-Shirt",
        slug: "casual-tshirt",
        description: "100% cotton unisex t-shirt",
        price: 49,
        category: categories[2]._id,
        quantity: 50,
        photo: { data: photoData, contentType: "image/png" },
        shipping: false,
      },
    ]);

    const orders = await Order.insertMany([
      {
        products: [products[0]._id, products[1]._id],
        payment: { method: "Credit Card", total: 3898 },
        buyer: users[0]._id,
        status: StatusEnum.Processing,
      },
      {
        products: [products[2]._id],
        payment: { method: "Cash on Delivery", total: 49 },
        buyer: users[1]._id,
        status: StatusEnum.Shipped,
      },
      {
        products: [products[1]._id],
        payment: { method: "Credit Card", total: 899 },
        buyer: users[2]._id,
        status: StatusEnum.NotProcess,
      },
    ]);

    console.log("Seeded collections");
  } catch (error) {
    console.error("Error resetting DB:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

resetDatabase();
