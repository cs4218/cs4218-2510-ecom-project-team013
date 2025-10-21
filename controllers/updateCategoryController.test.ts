import type { Request, Response } from "express";
import slugify from "slugify";
import categoryModel from "../models/categoryModel";
import { updateCategoryController } from "./categoryController";

jest.mock("../models/categoryModel");
jest.mock("slugify");

const mockedSlugify = slugify as jest.MockedFunction<typeof slugify>;

describe("updateCategoryController", () => {
  // TODO: Do not use global variables
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Input Validation", () => {
    it("should return 400 if name is missing", async () => {
      mockRequest.body = {};
      mockRequest.params = { id: "category123" };

      await updateCategoryController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith({
        success: false,
        message: "Name is required",
      });
      expect(categoryModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it("should return 400 if name is undefined", async () => {
      mockRequest.body = { name: undefined };
      mockRequest.params = { id: "category123" };

      await updateCategoryController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith({
        success: false,
        message: "Name is required",
      });
    });

    it("should return 400 if name is empty string", async () => {
      mockRequest.body = { name: "" };
      mockRequest.params = { id: "category123" };

      await updateCategoryController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith({
        success: false,
        message: "Name is required",
      });
    });

    it("should return 400 if id is missing", async () => {
      mockRequest.body = { name: "Electronics" };
      mockRequest.params = {};

      await updateCategoryController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith({
        success: false,
        message: "Category ID is required",
      });
      expect(categoryModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it("should return 400 if id is undefined", async () => {
      mockRequest.body = { name: "Electronics" };
      mockRequest.params = { id: undefined };

      await updateCategoryController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith({
        success: false,
        message: "Category ID is required",
      });
    });

    it("should return 400 if id is empty string", async () => {
      mockRequest.body = { name: "Electronics" };
      mockRequest.params = { id: "" };

      await updateCategoryController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith({
        success: false,
        message: "Category ID is required",
      });
    });

    it("should return 400 if both name and id are missing", async () => {
      mockRequest.body = {};
      mockRequest.params = {};

      await updateCategoryController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith({
        success: false,
        message: "Name is required",
      });
    });
  });

  describe("Category Existence Check", () => {
    it("should return 404 if category not found", async () => {
      mockRequest.body = { name: "Updated Category" };
      mockRequest.params = { id: "nonexistent123" };
      mockedSlugify.mockReturnValue("updated-category");
      (categoryModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      await updateCategoryController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "nonexistent123",
        { name: "Updated Category", slug: "updated-category" },
        { new: true }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.send).toHaveBeenCalledWith({
        success: false,
        message: "Category not found",
      });
    });

    it("should call findByIdAndUpdate with correct parameters", async () => {
      const categoryId = "category123";
      const categoryName = "Electronics";
      const generatedSlug = "electronics";

      mockRequest.body = { name: categoryName };
      mockRequest.params = { id: categoryId };
      mockedSlugify.mockReturnValue(generatedSlug);
      (categoryModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        _id: categoryId,
        name: categoryName,
        slug: generatedSlug,
      });

      await updateCategoryController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
        categoryId,
        { name: categoryName, slug: generatedSlug },
        { new: true }
      );
      expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe("Successful Update", () => {
    it("should update category and return 200 with updated category", async () => {
      const updatedCategory = {
        _id: "category123",
        name: "Updated Electronics",
        slug: "updated-electronics",
      };

      mockRequest.body = { name: "Updated Electronics" };
      mockRequest.params = { id: "category123" };
      mockedSlugify.mockReturnValue("updated-electronics");
      (categoryModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(
        updatedCategory
      );

      await updateCategoryController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith({
        success: true,
        message: "Category Updated Successfully",
        category: updatedCategory,
      });
    });

    it("should generate slug from category name", async () => {
      mockRequest.body = { name: "Home & Garden" };
      mockRequest.params = { id: "category123" };
      mockedSlugify.mockReturnValue("home-garden");
      (categoryModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        _id: "category123",
        name: "Home & Garden",
        slug: "home-garden",
      });

      await updateCategoryController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockedSlugify).toHaveBeenCalledWith("Home & Garden");
      expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "category123",
        { name: "Home & Garden", slug: "home-garden" },
        { new: true }
      );
    });

    it("should use new: true option to return updated document", async () => {
      mockRequest.body = { name: "Books" };
      mockRequest.params = { id: "category123" };
      mockedSlugify.mockReturnValue("books");
      (categoryModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        _id: "category123",
        name: "Books",
        slug: "books",
      });

      await updateCategoryController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        { new: true }
      );
    });
  });

  describe("Error Handling", () => {
    it("should return 500 if database update fails", async () => {
      mockRequest.body = { name: "Electronics" };
      mockRequest.params = { id: "category123" };
      mockedSlugify.mockReturnValue("electronics");

      const dbError = new Error("Database connection failed");
      (categoryModel.findByIdAndUpdate as jest.Mock).mockRejectedValue(dbError);

      await updateCategoryController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).toHaveBeenCalledWith({
        success: false,
        message: "Error while updating category",
      });
    });

    it("should not expose error details to client", async () => {
      mockRequest.body = { name: "Electronics" };
      mockRequest.params = { id: "category123" };
      mockedSlugify.mockReturnValue("electronics");

      const dbError = new Error("Sensitive database error with stack trace");
      (categoryModel.findByIdAndUpdate as jest.Mock).mockRejectedValue(dbError);

      await updateCategoryController(
        mockRequest as Request,
        mockResponse as Response
      );

      const sendCall = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(sendCall).not.toHaveProperty("error");
      expect(sendCall.message).toBe("Error while updating category");
    });

    it("should log errors to console.error with descriptive message", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      mockRequest.body = { name: "Electronics" };
      mockRequest.params = { id: "category123" };
      mockedSlugify.mockReturnValue("electronics");

      const dbError = new Error("Database error");
      (categoryModel.findByIdAndUpdate as jest.Mock).mockRejectedValue(dbError);

      await updateCategoryController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error updating category:",
        dbError
      );
      consoleErrorSpy.mockRestore();
    });

    it("should handle error during slugify operation", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      mockRequest.body = { name: "Electronics" };
      mockRequest.params = { id: "category123" };

      const slugError = new Error("Slugify error");
      mockedSlugify.mockImplementation(() => {
        throw slugError;
      });

      await updateCategoryController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error updating category:",
        slugError
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe("Edge Cases", () => {
    it("should handle category name with special characters", async () => {
      mockRequest.body = { name: "Electronics & Gadgets!" };
      mockRequest.params = { id: "category123" };
      mockedSlugify.mockReturnValue("electronics-gadgets");
      (categoryModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        _id: "category123",
        name: "Electronics & Gadgets!",
        slug: "electronics-gadgets",
      });

      await updateCategoryController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockedSlugify).toHaveBeenCalledWith("Electronics & Gadgets!");
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it("should handle very long category names", async () => {
      const longName = "A".repeat(200);
      const longSlug = "a".repeat(200);

      mockRequest.body = { name: longName };
      mockRequest.params = { id: "category123" };
      mockedSlugify.mockReturnValue(longSlug);
      (categoryModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        _id: "category123",
        name: longName,
        slug: longSlug,
      });

      await updateCategoryController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockedSlugify).toHaveBeenCalledWith(longName);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it("should handle MongoDB ObjectId format for id", async () => {
      const objectId = "507f1f77bcf86cd799439011";
      mockRequest.body = { name: "Electronics" };
      mockRequest.params = { id: objectId };
      mockedSlugify.mockReturnValue("electronics");
      (categoryModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        _id: objectId,
        name: "Electronics",
        slug: "electronics",
      });

      await updateCategoryController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
        objectId,
        expect.any(Object),
        expect.any(Object)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it("should strip whitespace in category name", async () => {
      mockRequest.body = { name: "  Electronics  " };
      mockRequest.params = { id: "category123" };
      mockedSlugify.mockReturnValue("electronics");
      (categoryModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        _id: "category123",
        name: "  Electronics  ",
        slug: "electronics",
      });

      await updateCategoryController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockedSlugify).toHaveBeenCalledWith("Electronics");
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it("should handle numeric category names", async () => {
      mockRequest.body = { name: "12345" };
      mockRequest.params = { id: "category123" };
      mockedSlugify.mockReturnValue("12345");
      (categoryModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        _id: "category123",
        name: "12345",
        slug: "12345",
      });

      await updateCategoryController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it("should only call status and send once on success", async () => {
      mockRequest.body = { name: "Electronics" };
      mockRequest.params = { id: "category123" };
      mockedSlugify.mockReturnValue("electronics");
      (categoryModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        _id: "category123",
        name: "Electronics",
        slug: "electronics",
      });

      await updateCategoryController(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledTimes(1);
      expect(mockResponse.send).toHaveBeenCalledTimes(1);
    });
  });
});
