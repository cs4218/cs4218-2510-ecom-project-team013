import type { RequestHandler } from "express";
import slugify from "slugify";
import categoryModel from "../models/categoryModel";

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Create category
export const createCategoryController = (async (req, res) => {
  try {
    let { name } = req.body as { name?: unknown };

    if (name == null) {
      return res
        .status(400)
        .send({ success: false, message: "Name is required" });
    }
    if (typeof name !== "string") {
      return res
        .status(400)
        .send({ success: false, message: "Name must be a string" });
    }

    name = name.trim();
    if (!name) {
      return res
        .status(400)
        .send({ success: false, message: "Name is required" });
    }

    const regex = new RegExp(`^${escapeRegex(name)}$`, "i");
    const existingCategory = await categoryModel.findOne({
      name: { $regex: regex },
    });
    if (existingCategory) {
      return res
        .status(409)
        .send({ success: false, message: "Category already exists" });
    }

    const category = await new categoryModel({
      name, // trimmed
      slug: slugify(name),
    }).save();

    return res.status(201).send({
      success: true,
      message: "Category created",
      category,
    });
  } catch (error: any) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error creating category",
      error: error?.message ?? String(error),
    });
  }
}) satisfies RequestHandler;

// Update category
export const updateCategoryController = (async (req, res) => {
  try {
    const { name } = req.body;
    const { id } = req.params;
    const category = await categoryModel.findByIdAndUpdate(
      id,
      { name, slug: slugify(name) },
      { new: true }
    );
    res.status(200).send({
      success: true,
      messsage: "Category Updated Successfully",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error while updating category",
    });
  }
}) satisfies RequestHandler;

// Get all categories
export const categoryController = (async (req, res) => {
  try {
    const category = await categoryModel.find({});
    res.status(200).send({
      success: true,
      message: "All Categories List",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error while getting all categories",
    });
  }
}) satisfies RequestHandler;

// Get single category
export const singleCategoryController = (async (req, res) => {
  try {
    const category = await categoryModel.findOne({ slug: req.params.slug });
    res.status(200).send({
      success: true,
      message: "Get SIngle Category SUccessfully",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error While getting Single Category",
    });
  }
}) satisfies RequestHandler;

// Delete category
export const deleteCategoryController = (async (req, res) => {
  try {
    const { id } = req.params;
    await categoryModel.findByIdAndDelete(id);
    res.status(200).send({
      success: true,
      message: "Categry Deleted Successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "error while deleting category",
      error,
    });
  }
}) satisfies RequestHandler;
