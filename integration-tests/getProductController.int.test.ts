import { Request, Response } from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { getProductController } from "../controllers/productController";
import productModel from "../models/productModel";

jest.mock("braintree", () => {
  return {
    BraintreeGateway: jest.fn().mockImplementation(() => ({})),
    Environment: { Sandbox: "Sandbox", Production: "Production" },
  };
});

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

const seedProduct = async () => {
  const current_time = new Date();
  const inserted = await productModel.insertMany([
    {
      name: "Test Product 1",
      slug: "test-product-1",
      description: "A seeded product",
      price: 100,
      category: new mongoose.Types.ObjectId(),
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
      category: new mongoose.Types.ObjectId(),
      quantity: 5,
      photo: { data: Buffer.from(""), contentType: "image/png" },
      shipping: false,
      createdAt: current_time,
    },
  ]);
  return inserted;
};

describe("Integration Test for GetProductController", () => {
  beforeAll(async () => {
    await dbConnect();
  });

  beforeEach(async () => {
    seededProducts = await seedProduct();
  });

  afterEach(async () => {
    await productModel.deleteMany({});
  });

  afterAll(async () => {
    await dbDisconnect();
  });

  it("should return all products successfully", async () => {
    const req = mockRequest();
    const res = mockResponse();

    await getProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "All Products",
        counTotal: 2,
      })
    );
    const responsePayload = (res.send as jest.Mock).mock.calls[0][0];
    const products = responsePayload.products.map((p: any) =>
      p.toObject ? p.toObject() : p
    );

    expect(products.length).toBe(2);
    expect(products[0]).not.toHaveProperty("photo");
    expect(products[0]).toHaveProperty("name");
    expect(products[0]).toHaveProperty("price");
  });

  it("should not return photo", async () => {
    const req = mockRequest();
    const res = mockResponse();

    await getProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    const responsePayload = (res.send as jest.Mock).mock.calls[0][0];
    const products = responsePayload.products.map((p: any) =>
      p.toObject ? p.toObject() : p
    );

    expect(products.length).toBe(2);
    expect(products[0]).not.toHaveProperty("photo");
  });

  it("should return products sorted by createdAt in descending order", async () => {
    const req = mockRequest();
    const res = mockResponse();

    await getProductController(req, res);

    const responsePayload = (res.send as jest.Mock).mock.calls[0][0];
    const products = responsePayload.products.map((p: any) =>
      p.toObject ? p.toObject() : p
    );

    expect(products.length).toBe(2);
    const firstDate = new Date(products[0].createdAt).getTime();
    const secondDate = new Date(products[1].createdAt).getTime();
    expect(firstDate).toBeGreaterThanOrEqual(secondDate);
  });

  it("should return empty list if no products exist", async () => {
    await productModel.deleteMany({});
    const req = mockRequest();
    const res = mockResponse();

    await getProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        counTotal: 0,
        products: [],
      })
    );
  });

  it("should handle internal server errors gracefully", async () => {
    const findSpy = jest
      .spyOn(productModel, "find")
      .mockImplementationOnce(() => {
        throw new Error("Database failure");
      });

    const req = mockRequest();
    const res = mockResponse();

    await getProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error in getting products",
        error: "Database failure",
      })
    );

    findSpy.mockRestore();
  });
});
