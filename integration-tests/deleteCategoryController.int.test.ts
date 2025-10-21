import type { Request, Response } from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { deleteCategoryController } from "../controllers/categoryController";
import categoryModel from "../models/categoryModel";

// Mock braintree to avoid initialization errors
jest.mock("braintree", () => {
  return {
    BraintreeGateway: jest.fn().mockImplementation(() => ({})),
    Environment: { Sandbox: "Sandbox", Production: "Production" },
  };
});

const mockRequest = (params = {}): Request => {
  return {
    params,
  } as Request;
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

let mongoServer: MongoMemoryServer;

const dbConnect = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
};

const dbDisconnect = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
};

describe("Integration Tests: deleteCategoryController", () => {
  beforeAll(async () => {
    await dbConnect();
  });

  afterEach(async () => {
    await categoryModel.deleteMany({});
  });

  afterAll(async () => {
    await dbDisconnect();
  });

  describe("Successful category deletion", () => {
    it("should delete category by ID and remove from database", async () => {
      const category = await categoryModel.create({
        name: "Electronics",
        slug: "electronics",
      });

      const req = mockRequest({ id: (category._id as any).toString() });
      const res = mockResponse();

      await deleteCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.send as jest.Mock).mock.calls[0][0];

      expect(payload.success).toBe(true);
      expect(payload.message).toBe("Category Deleted Successfully");

      // Verify deletion in database
      const deletedCategory = await categoryModel.findById(category._id);
      expect(deletedCategory).toBeNull();
    });

    it("should delete correct category when multiple exist", async () => {
      const categories = await categoryModel.insertMany([
        { name: "Electronics", slug: "electronics" },
        { name: "Books", slug: "books" },
        { name: "Clothing", slug: "clothing" },
      ]);

      const req = mockRequest({ id: (categories[1]._id as any).toString() });
      const res = mockResponse();

      await deleteCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      // Verify only the correct category was deleted
      const remainingCategories = await categoryModel.find({});
      expect(remainingCategories).toHaveLength(2);
      expect(
        remainingCategories.find((c) => c.name === "Books")
      ).toBeUndefined();
      expect(
        remainingCategories.find((c) => c.name === "Electronics")
      ).toBeDefined();
      expect(
        remainingCategories.find((c) => c.name === "Clothing")
      ).toBeDefined();
    });

    it("should handle deletion of category with special characters", async () => {
      const category = await categoryModel.create({
        name: "C++ Programming",
        slug: "c-programming",
      });

      const req = mockRequest({ id: (category._id as any).toString() });
      const res = mockResponse();

      await deleteCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const deletedCategory = await categoryModel.findById(category._id);
      expect(deletedCategory).toBeNull();
    });
  });

  describe("Error scenarios", () => {
    it("should handle deletion of non-existent category gracefully", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const req = mockRequest({ id: fakeId.toString() });
      const res = mockResponse();

      await deleteCategoryController(req, res);

      // Should still return 200 even if category doesn't exist
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should handle invalid ObjectId format", async () => {
      const req = mockRequest({ id: "invalid-id" });
      const res = mockResponse();

      await deleteCategoryController(req, res);

      // MongoDB will throw error for invalid ObjectId
      expect(res.status).toHaveBeenCalledWith(500);
      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.success).toBe(false);
    });
  });

  describe("Database integration", () => {
    it("should actually remove category from database", async () => {
      const category = await categoryModel.create({
        name: "Test Category",
        slug: "test-category",
      });

      const countBefore = await categoryModel.countDocuments();
      expect(countBefore).toBe(1);

      const req = mockRequest({ id: (category._id as any).toString() });
      const res = mockResponse();

      await deleteCategoryController(req, res);

      const countAfter = await categoryModel.countDocuments();
      expect(countAfter).toBe(0);
    });
  });

  describe("Error handling", () => {
    it("should return 500 when database operation fails", async () => {
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      const deleteSpy = jest
        .spyOn(categoryModel, "findByIdAndDelete")
        .mockRejectedValueOnce(new Error("Database error"));

      const req = mockRequest({ id: "507f1f77bcf86cd799439011" });
      const res = mockResponse();

      await deleteCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      const payload = (res.send as jest.Mock).mock.calls[0][0];

      expect(payload.success).toBe(false);
      expect(payload.message).toBe("error while deleting category");
      expect(payload.error).toBeDefined();

      deleteSpy.mockRestore();
      logSpy.mockRestore();
    });
  });
});
