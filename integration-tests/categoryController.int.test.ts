import type { Request, Response } from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import slugify from "slugify";
import { categoryController } from "../controllers/categoryController";
import categoryModel from "../models/categoryModel";

// Mock braintree to avoid initialization errors
jest.mock("braintree", () => {
  return {
    BraintreeGateway: jest.fn().mockImplementation(() => ({})),
    Environment: { Sandbox: "Sandbox", Production: "Production" },
  };
});

const mockRequest = (params = {}, body = {}): Request => {
  return {
    params,
    body,
  } as Request;
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
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

const seedCategories = async () => {
  const categories = await categoryModel.insertMany([
    { name: "Electronics", slug: "electronics" },
    { name: "Books", slug: "books" },
    { name: "Clothing", slug: "clothing" },
    { name: "Sports", slug: "sports" },
    { name: "Home & Garden", slug: "home-garden" },
  ]);
  return categories;
};

describe("Integration Tests: categoryController (Get All Categories)", () => {
  beforeAll(async () => {
    await dbConnect();
  });

  beforeEach(async () => {
    await seedCategories();
  });

  afterEach(async () => {
    await categoryModel.deleteMany({});
  });

  afterAll(async () => {
    await dbDisconnect();
  });

  describe("Successful retrieval of all categories", () => {
    it("should return all categories from database", async () => {
      const req = mockRequest();
      const res = mockResponse();

      await categoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.send as jest.Mock).mock.calls[0][0];

      expect(payload.success).toBe(true);
      expect(payload.message).toBe("All Categories List");
      expect(payload.category).toBeDefined();
      expect(payload.category).toHaveLength(5);
    });

    it("should return categories with correct data structure", async () => {
      const req = mockRequest();
      const res = mockResponse();

      await categoryController(req, res);

      const payload = (res.send as jest.Mock).mock.calls[0][0];
      const categories = payload.category;

      categories.forEach((cat: any) => {
        expect(cat).toHaveProperty("_id");
        expect(cat).toHaveProperty("name");
        expect(cat).toHaveProperty("slug");
      });
    });

    it("should return categories in insertion order", async () => {
      const req = mockRequest();
      const res = mockResponse();

      await categoryController(req, res);

      const payload = (res.send as jest.Mock).mock.calls[0][0];
      const categories = payload.category;

      expect(categories[0].name).toBe("Electronics");
      expect(categories[1].name).toBe("Books");
      expect(categories[2].name).toBe("Clothing");
    });
  });

  describe("Empty database scenario", () => {
    it("should return empty array when no categories exist", async () => {
      await categoryModel.deleteMany({});

      const req = mockRequest();
      const res = mockResponse();

      await categoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.send as jest.Mock).mock.calls[0][0];

      expect(payload.success).toBe(true);
      expect(payload.category).toEqual([]);
    });
  });

  describe("Large dataset handling", () => {
    it("should handle retrieving many categories", async () => {
      await categoryModel.deleteMany({});

      // Create 50 categories
      const manyCategories = Array.from({ length: 50 }, (_, i) => ({
        name: `Category ${i + 1}`,
        slug: slugify(`Category ${i + 1}`),
      }));
      await categoryModel.insertMany(manyCategories);

      const req = mockRequest();
      const res = mockResponse();

      await categoryController(req, res);

      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.category).toHaveLength(50);
    });
  });

  describe("Error handling", () => {
    it("should return 500 when database query fails", async () => {
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      const findSpy = jest
        .spyOn(categoryModel, "find")
        .mockRejectedValueOnce(new Error("Database connection error"));

      const req = mockRequest();
      const res = mockResponse();

      await categoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      const payload = (res.send as jest.Mock).mock.calls[0][0];

      expect(payload.success).toBe(false);
      expect(payload.message).toBe("Error while getting all categories");
      expect(payload.error).toBeDefined();

      findSpy.mockRestore();
      logSpy.mockRestore();
    });
  });
});
