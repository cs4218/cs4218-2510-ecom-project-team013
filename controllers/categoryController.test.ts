import type { Request, Response } from "express";
import slugify from "slugify";
import categoryModel from "../models/categoryModel";
import {
  categoryController,
  createCategoryController,
  deleteCategoryController,
  singleCategoryController,
  updateCategoryController,
} from "./categoryController";

jest.mock("../models/categoryModel");
jest.mock("slugify");

const mockedSlugify = slugify as jest.MockedFunction<typeof slugify>;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnThis();
  res.send = jest.fn().mockReturnThis();
  return res as Response;
};

describe("Category Controllers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createCategoryController", () => {
    it("should return 400 if name is missing", async () => {
      const req = { body: {} } as Request;
      const res = mockResponse();
      await createCategoryController(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "Name is required",
        success: false,
      });
    });

    it("should return 409 if category already exists", async () => {
      (categoryModel.findOne as jest.Mock).mockResolvedValue({ name: "Test" });
      const req = { body: { name: "Test" } } as Request;
      const res = mockResponse();
      await createCategoryController(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Category already exists",
      });
    });

    it("should create a new category", async () => {
      (categoryModel.findOne as jest.Mock).mockResolvedValue(null);
      mockedSlugify.mockReturnValue("test-slug");
      const saveMock = jest
        .fn()
        .mockResolvedValue({ name: "Test", slug: "test-slug" });
      (categoryModel as any).mockImplementation(() => ({ save: saveMock }));
      const req = { body: { name: "Test" } } as Request;
      const res = mockResponse();
      await createCategoryController(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Category created",
        category: { name: "Test", slug: "test-slug" },
      });
    });

    it("should handle errors", async () => {
      (categoryModel.findOne as jest.Mock).mockRejectedValue(
        new Error("DB Error")
      );
      const req = { body: { name: "Test" } } as Request;
      const res = mockResponse();
      await createCategoryController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "DB Error",
          message: "Error creating category",
        })
      );
    });
  });

  describe("updateCategoryController", () => {
    it("should update a category", async () => {
      (categoryModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        name: "Updated",
        slug: "updated-slug",
      });
      mockedSlugify.mockReturnValue("updated-slug");
      const req = {
        body: { name: "Updated" },
        params: { id: "1" },
      } as unknown as Request;
      const res = mockResponse();
      await updateCategoryController(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        messsage: "Category Updated Successfully",
        category: { name: "Updated", slug: "updated-slug" },
      });
    });

    it("should handle errors", async () => {
      (categoryModel.findByIdAndUpdate as jest.Mock).mockRejectedValue(
        new Error("DB Error")
      );
      const req = {
        body: { name: "Updated" },
        params: { id: "1" },
      } as unknown as Request;
      const res = mockResponse();
      await updateCategoryController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while updating category",
        })
      );
    });
  });

  describe("categoryController", () => {
    it("should get all categories", async () => {
      (categoryModel.find as jest.Mock).mockResolvedValue([
        { name: "Cat1" },
        { name: "Cat2" },
      ]);
      const req = {} as Request;
      const res = mockResponse();
      await categoryController(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "All Categories List",
        category: [{ name: "Cat1" }, { name: "Cat2" }],
      });
    });

    it("should handle errors", async () => {
      (categoryModel.find as jest.Mock).mockRejectedValue(
        new Error("DB Error")
      );
      const req = {} as Request;
      const res = mockResponse();
      await categoryController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while getting all categories",
        })
      );
    });
  });

  describe("singleCategoryController", () => {
    it("should get a single category", async () => {
      (categoryModel.findOne as jest.Mock).mockResolvedValue({
        name: "Cat1",
        slug: "cat1",
      });
      const req = { params: { slug: "cat1" } } as unknown as Request;
      const res = mockResponse();
      await singleCategoryController(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Get SIngle Category SUccessfully",
        category: { name: "Cat1", slug: "cat1" },
      });
    });

    it("should handle errors", async () => {
      (categoryModel.findOne as jest.Mock).mockRejectedValue(
        new Error("DB Error")
      );
      const req = { params: { slug: "cat1" } } as unknown as Request;
      const res = mockResponse();
      await singleCategoryController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error While getting Single Category",
        })
      );
    });
  });

  describe("deleteCategoryController", () => {
    it("should delete a category", async () => {
      (categoryModel.findByIdAndDelete as jest.Mock).mockResolvedValue({});
      const req = { params: { id: "1" } } as unknown as Request;
      const res = mockResponse();
      await deleteCategoryController(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Categry Deleted Successfully",
      });
    });

    it("should handle errors", async () => {
      (categoryModel.findByIdAndDelete as jest.Mock).mockRejectedValue(
        new Error("DB Error")
      );
      const req = { params: { id: "1" } } as unknown as Request;
      const res = mockResponse();
      await deleteCategoryController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "error while deleting category",
        })
      );
    });
  });
});
