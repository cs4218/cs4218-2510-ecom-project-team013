import type { Request, Response } from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { singleCategoryController } from "../controllers/categoryController";
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

describe("Integration Tests: singleCategoryController", () => {
  beforeAll(async () => {
    await dbConnect();
  });

  afterEach(async () => {
    await categoryModel.deleteMany({});
  });

  afterAll(async () => {
    await dbDisconnect();
  });

  describe("Successful single category retrieval", () => {
    it("should retrieve category by slug", async () => {
      await categoryModel.create({
        name: "Electronics",
        slug: "electronics",
      });

      const req = mockRequest({ slug: "electronics" });
      const res = mockResponse();

      await singleCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.send as jest.Mock).mock.calls[0][0];

      expect(payload.success).toBe(true);
      expect(payload.message).toBe("Get Single Category Successfully");
      expect(payload.category).toBeDefined();
      expect(payload.category.name).toBe("Electronics");
      expect(payload.category.slug).toBe("electronics");
    });

    it("should return correct category when multiple exist", async () => {
      await categoryModel.insertMany([
        { name: "Electronics", slug: "electronics" },
        { name: "Books", slug: "books" },
        { name: "Clothing", slug: "clothing" },
      ]);

      const req = mockRequest({ slug: "books" });
      const res = mockResponse();

      await singleCategoryController(req, res);

      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.category.name).toBe("Books");
      expect(payload.category.slug).toBe("books");
    });

    it("should handle slug with special characters", async () => {
      await categoryModel.create({
        name: "Home & Garden",
        slug: "home-garden",
      });

      const req = mockRequest({ slug: "home-garden" });
      const res = mockResponse();

      await singleCategoryController(req, res);

      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.category.name).toBe("Home & Garden");
    });
  });

  describe("Category not found scenarios", () => {
    it("should return null when category does not exist", async () => {
      const req = mockRequest({ slug: "nonexistent" });
      const res = mockResponse();

      await singleCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.category).toBeNull();
    });

    it("should handle empty slug parameter", async () => {
      const req = mockRequest({ slug: "" });
      const res = mockResponse();

      await singleCategoryController(req, res);

      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.category).toBeNull();
    });
  });

  describe("Error handling", () => {
    it("should return 500 when database query fails", async () => {
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      const findOneSpy = jest
        .spyOn(categoryModel, "findOne")
        .mockRejectedValueOnce(new Error("Database error"));

      const req = mockRequest({ slug: "electronics" });
      const res = mockResponse();

      await singleCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      const payload = (res.send as jest.Mock).mock.calls[0][0];

      expect(payload.success).toBe(false);
      expect(payload.message).toBe("Error While getting Single Category");
      expect(payload.error).toBeDefined();

      findOneSpy.mockRestore();
      logSpy.mockRestore();
    });
  });

  describe("Integration with database", () => {
    it("should return full category document with all fields", async () => {
      await categoryModel.create({
        name: "Test Category",
        slug: "test-category",
      });

      const req = mockRequest({ slug: "test-category" });
      const res = mockResponse();

      await singleCategoryController(req, res);

      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.category).toHaveProperty("_id");
      expect(payload.category).toHaveProperty("name");
      expect(payload.category).toHaveProperty("slug");
    });
  });
});
