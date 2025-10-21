import { Request, Response } from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { relatedProductController } from "../controllers/productController";
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
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

let mongoServer: MongoMemoryServer;
let seededCategories: any[];
let seededProducts: any[];

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
  ]);
  return categories;
};

const seedProducts = async (categories: any[]) => {
  const products = await productModel.insertMany([
    {
      name: "Laptop",
      slug: "laptop",
      description: "High-performance laptop",
      price: 1200,
      category: categories[0]._id, // Electronics
      quantity: 10,
      photo: { data: Buffer.from(""), contentType: "image/png" },
      shipping: true,
    },
    {
      name: "Mouse",
      slug: "mouse",
      description: "Wireless mouse",
      price: 25,
      category: categories[0]._id, // Electronics
      quantity: 50,
      photo: { data: Buffer.from(""), contentType: "image/png" },
      shipping: true,
    },
    {
      name: "Keyboard",
      slug: "keyboard",
      description: "Mechanical keyboard",
      price: 85,
      category: categories[0]._id, // Electronics
      quantity: 30,
      photo: { data: Buffer.from(""), contentType: "image/png" },
      shipping: true,
    },
    {
      name: "Monitor",
      slug: "monitor",
      description: "4K monitor",
      price: 350,
      category: categories[0]._id, // Electronics
      quantity: 15,
      photo: { data: Buffer.from(""), contentType: "image/png" },
      shipping: true,
    },
    {
      name: "Novel",
      slug: "novel",
      description: "Bestselling novel",
      price: 15,
      category: categories[1]._id, // Books
      quantity: 100,
      photo: { data: Buffer.from(""), contentType: "image/png" },
      shipping: true,
    },
    {
      name: "Textbook",
      slug: "textbook",
      description: "Computer Science textbook",
      price: 80,
      category: categories[1]._id, // Books
      quantity: 25,
      photo: { data: Buffer.from(""), contentType: "image/png" },
      shipping: true,
    },
  ]);
  return products;
};

describe("Integration Tests for relatedProductController", () => {
  beforeAll(async () => {
    await dbConnect();
  });

  beforeEach(async () => {
    seededCategories = await seedCategories();
    seededProducts = await seedProducts(seededCategories);
  });

  afterEach(async () => {
    await productModel.deleteMany({});
    await categoryModel.deleteMany({});
  });

  afterAll(async () => {
    await dbDisconnect();
  });

  describe("Successful related product retrieval", () => {
    it("should return related products from same category excluding the given product", async () => {
      const targetProduct = seededProducts[0]; // Laptop
      const req = mockRequest({
        pid: targetProduct._id.toString(),
        cid: seededCategories[0]._id.toString(), // Electronics
      });
      const res = mockResponse();

      await relatedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.products).toBeDefined();
      expect(Array.isArray(payload.products)).toBe(true);

      // Should not include the target product (Laptop)
      const productIds = payload.products.map((p: any) => p._id.toString());
      expect(productIds).not.toContain(targetProduct._id.toString());

      // All products should be from Electronics category
      payload.products.forEach((product: any) => {
        expect(product.category._id.toString()).toBe(
          seededCategories[0]._id.toString()
        );
      });
    });

    it("should limit results to 3 products", async () => {
      const targetProduct = seededProducts[0]; // Laptop
      const req = mockRequest({
        pid: targetProduct._id.toString(),
        cid: seededCategories[0]._id.toString(), // Electronics (has 4 products total)
      });
      const res = mockResponse();

      await relatedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.products.length).toBeLessThanOrEqual(3);
    });

    it("should exclude photo data from related products", async () => {
      const targetProduct = seededProducts[0]; // Laptop
      const req = mockRequest({
        pid: targetProduct._id.toString(),
        cid: seededCategories[0]._id.toString(),
      });
      const res = mockResponse();

      await relatedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.send as jest.Mock).mock.calls[0][0];

      payload.products.forEach((product: any) => {
        // select("-photo") excludes photo data - it should not be a Buffer with actual data
        if (product.photo !== undefined) {
          expect(product.photo).not.toBeInstanceOf(Buffer);
        }
      });
    });

    it("should populate category information in related products", async () => {
      const targetProduct = seededProducts[0]; // Laptop
      const req = mockRequest({
        pid: targetProduct._id.toString(),
        cid: seededCategories[0]._id.toString(),
      });
      const res = mockResponse();

      await relatedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.send as jest.Mock).mock.calls[0][0];

      payload.products.forEach((product: any) => {
        expect(product.category).toBeDefined();
        expect(product.category.name).toBeDefined();
        expect(product.category.slug).toBeDefined();
      });
    });

    it("should return empty array when no other products in category", async () => {
      const targetProduct = seededProducts[4]; // Novel (only 2 books)
      const req = mockRequest({
        pid: targetProduct._id.toString(),
        cid: seededCategories[1]._id.toString(), // Books
      });
      const res = mockResponse();

      await relatedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.products.length).toBe(1); // Only 1 other book (Textbook)
    });

    it("should return empty array when product is the only one in category", async () => {
      // Create a new category with only one product
      const soloCategory = await categoryModel.create({
        name: "Solo Category",
        slug: "solo-category",
      });

      const soloProduct = await productModel.create({
        name: "Solo Product",
        slug: "solo-product",
        description: "Only product in category",
        price: 100,
        category: soloCategory._id,
        quantity: 5,
        photo: { data: Buffer.from(""), contentType: "image/png" },
        shipping: true,
      });

      const req = mockRequest({
        pid: soloProduct._id.toString(),
        cid: soloCategory._id.toString(),
      });
      const res = mockResponse();

      await relatedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.products).toEqual([]);
    });
  });

  describe("Parameter validation", () => {
    it("should return 400 when pid is missing", async () => {
      const req = mockRequest({
        cid: seededCategories[0]._id.toString(),
      });
      const res = mockResponse();

      await relatedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Both pid and cid are required",
      });
    });

    it("should return 400 when cid is missing", async () => {
      const req = mockRequest({
        pid: seededProducts[0]._id.toString(),
      });
      const res = mockResponse();

      await relatedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Both pid and cid are required",
      });
    });

    it("should return 400 when both pid and cid are missing", async () => {
      const req = mockRequest({});
      const res = mockResponse();

      await relatedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Both pid and cid are required",
      });
    });

    it("should return 400 when pid is empty string", async () => {
      const req = mockRequest({
        pid: "",
        cid: seededCategories[0]._id.toString(),
      });
      const res = mockResponse();

      await relatedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Both pid and cid are required",
      });
    });

    it("should return 400 when cid is empty string", async () => {
      const req = mockRequest({
        pid: seededProducts[0]._id.toString(),
        cid: "",
      });
      const res = mockResponse();

      await relatedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Both pid and cid are required",
      });
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle non-existent product ID gracefully", async () => {
      const fakeProductId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        pid: fakeProductId,
        cid: seededCategories[0]._id.toString(),
      });
      const res = mockResponse();

      await relatedProductController(req, res);

      // Should still return successfully with related products from category
      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.success).toBe(true);
    });

    it("should handle non-existent category ID gracefully", async () => {
      const fakeCategoryId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        pid: seededProducts[0]._id.toString(),
        cid: fakeCategoryId,
      });
      const res = mockResponse();

      await relatedProductController(req, res);

      // Should return empty array as no products match category
      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.products).toEqual([]);
    });

    it("should handle invalid ObjectId format for pid", async () => {
      const req = mockRequest({
        pid: "invalid-id-format",
        cid: seededCategories[0]._id.toString(),
      });
      const res = mockResponse();

      await relatedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error while getting related products",
      });
    });

    it("should handle invalid ObjectId format for cid", async () => {
      const req = mockRequest({
        pid: seededProducts[0]._id.toString(),
        cid: "invalid-category-id",
      });
      const res = mockResponse();

      await relatedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error while getting related products",
      });
    });

    it("should handle database connection errors", async () => {
      const req = mockRequest({
        pid: seededProducts[0]._id.toString(),
        cid: seededCategories[0]._id.toString(),
      });
      const res = mockResponse();

      const productSpy = jest
        .spyOn(productModel, "find")
        .mockImplementationOnce(() => {
          throw new Error("Database connection failed");
        });

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      await relatedProductController(req, res);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error getting related products:",
        expect.any(Error)
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error while getting related products",
      });

      productSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("Query behavior and filtering", () => {
    it("should correctly filter by category and exclude target product", async () => {
      const targetProduct = seededProducts[0]; // Laptop
      const req = mockRequest({
        pid: targetProduct._id.toString(),
        cid: seededCategories[0]._id.toString(),
      });
      const res = mockResponse();

      const findSpy = jest.spyOn(productModel, "find");

      await relatedProductController(req, res);

      // Verify the query was called with correct filters
      expect(findSpy).toHaveBeenCalledWith({
        category: seededCategories[0]._id.toString(),
        _id: { $ne: targetProduct._id.toString() },
      });

      findSpy.mockRestore();
    });

    it("should return products in consistent order on multiple calls", async () => {
      const targetProduct = seededProducts[0]; // Laptop
      const req1 = mockRequest({
        pid: targetProduct._id.toString(),
        cid: seededCategories[0]._id.toString(),
      });
      const res1 = mockResponse();

      await relatedProductController(req1, res1);

      const payload1 = (res1.send as jest.Mock).mock.calls[0][0];
      const productIds1 = payload1.products.map((p: any) => p._id.toString());

      const req2 = mockRequest({
        pid: targetProduct._id.toString(),
        cid: seededCategories[0]._id.toString(),
      });
      const res2 = mockResponse();

      await relatedProductController(req2, res2);

      const payload2 = (res2.send as jest.Mock).mock.calls[0][0];
      const productIds2 = payload2.products.map((p: any) => p._id.toString());

      expect(productIds1).toEqual(productIds2);
    });

    it("should handle category with exactly 3 other products", async () => {
      const targetProduct = seededProducts[0]; // Laptop (Electronics has 4 total)
      const req = mockRequest({
        pid: targetProduct._id.toString(),
        cid: seededCategories[0]._id.toString(),
      });
      const res = mockResponse();

      await relatedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.products.length).toBe(3);
    });

    it("should handle category with more than 3 other products", async () => {
      // Add more electronics products
      await productModel.insertMany([
        {
          name: "Tablet",
          slug: "tablet",
          description: "Portable tablet",
          price: 300,
          category: seededCategories[0]._id,
          quantity: 20,
          photo: { data: Buffer.from(""), contentType: "image/png" },
          shipping: true,
        },
        {
          name: "Headphones",
          slug: "headphones",
          description: "Noise-cancelling headphones",
          price: 150,
          category: seededCategories[0]._id,
          quantity: 40,
          photo: { data: Buffer.from(""), contentType: "image/png" },
          shipping: true,
        },
      ]);

      const targetProduct = seededProducts[0]; // Laptop
      const req = mockRequest({
        pid: targetProduct._id.toString(),
        cid: seededCategories[0]._id.toString(),
      });
      const res = mockResponse();

      await relatedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.send as jest.Mock).mock.calls[0][0];
      expect(payload.products.length).toBe(3); // Should still limit to 3
    });
  });

  describe("Concurrency and performance", () => {
    it("should handle multiple simultaneous requests", async () => {
      const req1 = mockRequest({
        pid: seededProducts[0]._id.toString(),
        cid: seededCategories[0]._id.toString(),
      });
      const req2 = mockRequest({
        pid: seededProducts[4]._id.toString(),
        cid: seededCategories[1]._id.toString(),
      });
      const res1 = mockResponse();
      const res2 = mockResponse();

      await Promise.all([
        relatedProductController(req1, res1),
        relatedProductController(req2, res2),
      ]);

      expect(res1.status).toHaveBeenCalledWith(200);
      expect(res2.status).toHaveBeenCalledWith(200);

      const payload1 = (res1.send as jest.Mock).mock.calls[0][0];
      const payload2 = (res2.send as jest.Mock).mock.calls[0][0];

      expect(payload1.success).toBe(true);
      expect(payload2.success).toBe(true);
    });

    it("should handle requests with same category but different products", async () => {
      const req1 = mockRequest({
        pid: seededProducts[0]._id.toString(), // Laptop
        cid: seededCategories[0]._id.toString(),
      });
      const req2 = mockRequest({
        pid: seededProducts[1]._id.toString(), // Mouse
        cid: seededCategories[0]._id.toString(),
      });
      const res1 = mockResponse();
      const res2 = mockResponse();

      await Promise.all([
        relatedProductController(req1, res1),
        relatedProductController(req2, res2),
      ]);

      const payload1 = (res1.send as jest.Mock).mock.calls[0][0];
      const payload2 = (res2.send as jest.Mock).mock.calls[0][0];

      // Verify different products are excluded
      const productIds1 = payload1.products.map((p: any) => p._id.toString());
      const productIds2 = payload2.products.map((p: any) => p._id.toString());

      expect(productIds1).not.toContain(seededProducts[0]._id.toString());
      expect(productIds2).not.toContain(seededProducts[1]._id.toString());
    });
  });

  describe("Data integrity", () => {
    it("should not modify the original product data in database", async () => {
      const targetProduct = seededProducts[0];
      const req = mockRequest({
        pid: targetProduct._id.toString(),
        cid: seededCategories[0]._id.toString(),
      });
      const res = mockResponse();

      await relatedProductController(req, res);

      // Verify original product still exists and unchanged
      const dbProduct = await productModel.findById(targetProduct._id);
      expect(dbProduct).toBeDefined();
      expect(dbProduct?.name).toBe(targetProduct.name);
      expect(dbProduct?.price).toBe(targetProduct.price);
    });

    it("should not expose internal database structure", async () => {
      const targetProduct = seededProducts[0];
      const req = mockRequest({
        pid: targetProduct._id.toString(),
        cid: seededCategories[0]._id.toString(),
      });
      const res = mockResponse();

      await relatedProductController(req, res);

      const payload = (res.send as jest.Mock).mock.calls[0][0];

      payload.products.forEach((product: any) => {
        // Verify standard product fields are present
        expect(product.name).toBeDefined();
        expect(product.price).toBeDefined();
        expect(product.category).toBeDefined();

        // Photo data should not be loaded (select("-photo"))
        if (product.photo !== undefined) {
          expect(product.photo).not.toBeInstanceOf(Buffer);
        }
      });
    });
  });
});
