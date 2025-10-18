import { Request, Response } from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { getSingleProductController } from "../controllers/productController";
import categoryModel from "../models/categoryModel";
import productModel from "../models/productModel";

const mockRequest = (params = {}, body = {}) => {
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
let seededProducts: any[];
let seededCategories: any[];

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

const seedProduct = async (categoryId = new mongoose.Types.ObjectId()) => {
  const current_time = new Date();
  const inserted = await productModel.insertMany([
    {
      name: "Test Product 1",
      slug: "test-product-1",
      description: "A seeded product",
      price: 100,
      category: categoryId,
      quantity: 10,
      photo: { data: Buffer.from(""), contentType: "image/png" },
      shipping: true,
      createdAt: new Date(current_time.getTime() - 1000 * 60 * 60),
    },
    {
      name: "Test Product 2",
      slug: "test-product-2",
      description: "Another product",
      price: 200,
      category: categoryId,
      quantity: 5,
      photo: { data: Buffer.from(""), contentType: "image/png" },
      shipping: false,
      createdAt: current_time,
    },
  ]);
  return inserted;
};

const seedCategory = async () => {
  const inserted = await categoryModel.insertMany([
    {
      name: "Test-Category-1",
      slug: "test-Category-1",
    },
    {
      name: "Test-Category-2",
      slug: "test-Category-2",
    },
  ]);
  return inserted;
};

describe("Integration Test for GetSingleProductController", () => {
  beforeAll(async () => {
    await dbConnect();
  });

  beforeEach(async () => {
    seededCategories = await seedCategory();
    seededProducts = await seedProduct(seededCategories[0].id);
  });

  afterEach(async () => {
    await productModel.deleteMany({});
    await categoryModel.deleteMany({});
  });

  afterAll(async () => {
    await dbDisconnect();
  });

  it("should return a single product successfully by slug", async () => {
    const req = mockRequest({ slug: "test-product-1" });
    const res = mockResponse();

    await getSingleProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responsePayload = (res.send as jest.Mock).mock.calls[0][0];
    expect(responsePayload.success).toBe(true);
    expect(responsePayload.message).toBe("Single product fetched");
  });

  it("should return a product with populated category", async () => {
    const req = mockRequest({ slug: "test-product-1" });
    const res = mockResponse();

    await getSingleProductController(req, res);

    const responsePayload = (res.send as jest.Mock).mock.calls[0][0];

    const returnedProduct = responsePayload.product;
    expect(returnedProduct.category).toBeDefined();
    expect(returnedProduct.category).toHaveProperty(
      "name",
      seededCategories[0].name
    );
    expect(returnedProduct.category).toHaveProperty(
      "slug",
      seededCategories[0].slug
    );
  });

  it("should return a product excluding the photo field", async () => {
    const req = mockRequest({ slug: "test-product-1" });
    const res = mockResponse();

    await getSingleProductController(req, res);

    const responsePayload = (res.send as jest.Mock).mock.calls[0][0];

    const returnedProduct = responsePayload.product.toObject
      ? responsePayload.product.toObject()
      : responsePayload.product;
    expect(returnedProduct).not.toHaveProperty("photo");
  });

  it("should return 400 if slug is missing", async () => {
    const req = mockRequest({});
    const res = mockResponse();

    await getSingleProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const responsePayload = (res.send as jest.Mock).mock.calls[0][0];
    expect(responsePayload.success).toBe(false);
    expect(responsePayload.message).toBe("slug is required");
  });

  it("should return 404 if product not found", async () => {
    const req = mockRequest({ slug: "nonexistent-product" });
    const res = mockResponse();

    await getSingleProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    const responsePayload = (res.send as jest.Mock).mock.calls[0][0];
    expect(responsePayload.success).toBe(false);
    expect(responsePayload.message).toBe("Product not found");
  });

  it("should handle internal server errors gracefully", async () => {
    const req = mockRequest({ slug: "test-product-1" });
    const res = mockResponse();

    const findOneSpy = jest
      .spyOn(productModel, "findOne")
      .mockImplementationOnce(() => {
        throw new Error("Database failure");
      });

    await getSingleProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const responsePayload = (res.send as jest.Mock).mock.calls[0][0];
    expect(responsePayload.success).toBe(false);
    expect(responsePayload.message).toBe("Error while getting single product");

    findOneSpy.mockRestore();
  });
});
