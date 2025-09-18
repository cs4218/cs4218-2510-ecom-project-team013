import { Router } from "express";
import {
  categoryController,
  createCategoryController,
  deleteCategoryController,
  singleCategoryController,
  updateCategoryController,
} from "../controllers/categoryController";
import { isAdmin, requireSignIn } from "../middlewares/authMiddleware";

const router = Router()
  // Create category
  .post("/create-category", requireSignIn, isAdmin, createCategoryController)
  // Update category
  .put("/update-category/:id", requireSignIn, isAdmin, updateCategoryController)
  // GetALl category
  .get("/get-category", categoryController)
  // Single category
  .get("/single-category/:slug", singleCategoryController)
  // Delete category
  .delete(
    "/delete-category/:id",
    requireSignIn,
    isAdmin,
    deleteCategoryController
  );

export default router;
