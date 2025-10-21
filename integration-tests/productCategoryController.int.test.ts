import type { Request, Response } from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { productCategoryController } from "../controllers/productController";
import categoryModel from "../models/categoryModel";
import productModel from "../models/productModel";

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

describe("Integration Tests: productCategoryController", () => {
  beforeAll(async () => {
    await dbConnect();
  });

  afterEach(async () => {
    await productModel.deleteMany({});
    await categoryModel.deleteMany({});
  });

  afterAll(async () => {
    await dbDisconnect();
  });

  describe("Successful product retrieval by category", () => {
    it("should return products for a valid category slug", async () => {
      const category = await categoryModel.create({
        name: "Electronics",
        slug: "electronics",
      });

      await productModel.insertMany([
        {
          name: "Laptop",
          slug: "laptop",
          description: "A laptop",
          price: 1000,
          category: category._id,
          quantity: 10,
          shipping: false,
        },
        {
          name: "Phone",
          slug: "phone",
          description: "A phone",
          price: 500,
          category: category._id,
          quantity: 20,
          shipping: true,
        },
      ]);

      const req = mockRequest({ slug: "electronics" });
      const res = mockResponse();

      await productCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.send as jest.Mock).mock.calls[0][0];

      expect(payload.success).toBe(true);
      expect(payload.category).toBeDefined();
      expect(payload.products).toHaveLength(2);
    });

    it("should populate category details in products", async () => {
      const category = await categoryModel.create({
        name: "Books",
        slug: "books",
      });

      await productModel.create({
        name: "Novel",
        slug: "novel",
        description: "A novel",
        price: 20,
        category: category._id,
        quantity: 50,
        shipping: false,
      });

      const req = mockRequest({ slug: "books" });
      const res = mockResponse();

      await productCategoryController(req, res);

      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.products[0].category).toBeDefined();
      expect(payload.products[0].category.name).toBe("Books");
    });

    it("should return empty array when category has no products", async () => {
      await categoryModel.create({
        name: "Empty Category",
        slug: "empty-category",
      });

      const req = mockRequest({ slug: "empty-category" });
      const res = mockResponse();

      await productCategoryController(req, res);

      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.products).toEqual([]);
    });

    it("should filter products correctly by category ID", async () => {
      const electronics = await categoryModel.create({
        name: "Electronics",
        slug: "electronics",
      });

      const books = await categoryModel.create({
        name: "Books",
        slug: "books",
      });

      await productModel.insertMany([
        {
          name: "Laptop",
          slug: "laptop",
          description: "A laptop",
          price: 1000,
          category: electronics._id,
          quantity: 10,
          shipping: false,
        },
        {
          name: "Novel",
          slug: "novel",
          description: "A novel",
          price: 20,
          category: books._id,
          quantity: 50,
          shipping: false,
        },
      ]);

      const req = mockRequest({ slug: "electronics" });
      const res = mockResponse();

      await productCategoryController(req, res);

      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.products).toHaveLength(1);
      expect(payload.products[0].name).toBe("Laptop");
    });
  });

  describe("Category not found scenarios", () => {
    it("should handle non-existent category slug", async () => {
      const req = mockRequest({ slug: "nonexistent" });
      const res = mockResponse();

      await productCategoryController(req, res);

      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.category).toBeNull();
    });
  });

  describe("Error handling", () => {
    it("should return 400 when database operation fails", async () => {
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      const findOneSpy = jest
        .spyOn(categoryModel, "findOne")
        .mockRejectedValueOnce(new Error("Database error"));

      const req = mockRequest({ slug: "electronics" });
      const res = mockResponse();

      await productCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const payload = (res.send as jest.Mock).mock.calls[0][0];

      expect(payload.success).toBe(false);
      expect(payload.message).toBe("Error while getting products");
      expect(payload.error).toBeDefined();

      findOneSpy.mockRestore();
      logSpy.mockRestore();
    });
  });

  describe("Integration with category model", () => {
    it("should return both category and products in response", async () => {
      const category = await categoryModel.create({
        name: "Sports",
        slug: "sports",
      });

      await productModel.create({
        name: "Football",
        slug: "football",
        description: "A football",
        price: 30,
        category: category._id,
        quantity: 100,
        shipping: true,
      });

      const req = mockRequest({ slug: "sports" });
      const res = mockResponse();

      await productCategoryController(req, res);

      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.category.name).toBe("Sports");
      expect(payload.category.slug).toBe("sports");
      expect(payload.products).toHaveLength(1);
      expect(payload.products[0].name).toBe("Football");
    });
  });
});
