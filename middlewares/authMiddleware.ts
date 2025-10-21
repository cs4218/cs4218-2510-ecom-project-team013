import type { RequestHandler } from "express";
import JWT from "jsonwebtoken";
import userModel from "../models/userModel";

// Protected routes token base
export const requireSignIn: RequestHandler = async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");
      return res.status(500).send({
        success: false,
        message: "Server configuration error",
      });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).send({
        success: false,
        message: "Authorization token required",
      });
    }

    // Support both "Bearer <token>" and plain token formats
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : authHeader;

    if (!token || token.trim() === "") {
      return res.status(401).send({
        success: false,
        message: "Invalid authorization token",
      });
    }

    const decode = JWT.verify(token, process.env.JWT_SECRET) as {
      _id: string;
      iat?: number;
      exp?: number;
    };

    if (!decode || !decode._id) {
      return res.status(401).send({
        success: false,
        message: "Invalid token payload",
      });
    }

    req.user = decode;
    next();
  } catch (error) {
    console.error("Authentication error:", error);

    // Check TokenExpiredError first (it extends JsonWebTokenError)
    if (error instanceof JWT.TokenExpiredError) {
      return res.status(401).send({
        success: false,
        message: "Token expired",
      });
    }

    if (error instanceof JWT.JsonWebTokenError) {
      return res.status(401).send({
        success: false,
        message: "Invalid token",
      });
    }

    return res.status(401).send({
      success: false,
      message: "Authentication failed",
    });
  }
};

// Admin access
export const isAdmin: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).send({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await userModel.findById(req.user._id);

    if (!user) {
      return res.status(401).send({
        success: false,
        message: "User not found",
      });
    }

    if (user.role !== 1) {
      return res.status(403).send({
        success: false,
        message: "Admin access required",
      });
    }

    next();
  } catch (error) {
    console.error("Admin authorization error:", error);

    return res.status(500).send({
      success: false,
      message: "Authorization check failed",
    });
  }
};
