import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import productModel from "../models/productModel";
import { deleteProductController } from "../controllers/productController";
import { Request, Response } from "express";

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
    },
  ]);
  return inserted;
};

describe("Integration Test for DeleteProduct Controller", () => {
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

  it("should successfully delete an existing product", async () => {
    const productId = seededProducts[0]._id.toString();
    const req = mockRequest({ pid: productId });
    const res = mockResponse();

    await deleteProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Product Deleted successfully",
    });

    // Verify product is actually deleted from database
    const deletedProduct = await productModel.findById(productId);
    expect(deletedProduct).toBeNull();
  });

  it("should return 404 when trying to delete a non-existent product", async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const req = mockRequest({ pid: nonExistentId });
    const res = mockResponse();

    await deleteProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Product not found",
    });
  });

  it("should handle invalid ObjectId format", async () => {
    const req = mockRequest({ pid: "invalid-id" });
    const res = mockResponse();

    await deleteProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while deleting product",
    });
  });
});
