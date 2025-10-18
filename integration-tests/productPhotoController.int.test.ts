import { Request, Response } from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { productPhotoController } from "../controllers/productController";
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
  res.set = jest.fn().mockReturnValue(res);
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

const fakeBuffer = Buffer.from("fake-image-data");

const seedProduct = async () => {
  const inserted = await productModel.insertMany([
    {
      name: "Test Product 1",
      slug: "test-product-1",
      description: "A seeded product",
      price: 100,
      category: new mongoose.Types.ObjectId(),
      quantity: 10,
      photo: { data: fakeBuffer, contentType: "image/png" },
      shipping: true,
    },
    {
      name: "Test Product 2",
      slug: "test-product-2",
      description: "Another product",
      price: 200,
      category: new mongoose.Types.ObjectId(),
      quantity: 5,
      photo: { data: fakeBuffer, contentType: "image/png" },
      shipping: false,
    },
  ]);
  return inserted;
};

describe("Integration Test for ProductPhotoController", () => {
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

  it("should return photo binary data successfully", async () => {
    const req = mockRequest({ pid: seededProducts[0].id });
    const res = mockResponse();

    await productPhotoController(req, res);

    expect(res.set).toHaveBeenCalledWith("Content-Type", "image/png");
    expect(res.status).toHaveBeenCalledWith(200);

    const sentData = (res.send as jest.Mock).mock.calls[0][0];
    expect(sentData.equals(fakeBuffer)).toBe(true);
  });

  it("should return 404 if product does not exist", async () => {
    const req = mockRequest({ pid: new mongoose.Types.ObjectId().toString() });
    const res = mockResponse();

    await productPhotoController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Product not found",
    });
  });

  it("should return 404 if photo data is missing or empty", async () => {
    const product = await productModel.create({
      name: "Empty-photo",
      slug: "empty-photo",
      description: "empty photo",
      price: 300,
      category: new mongoose.Types.ObjectId(),
      quantity: 30,
      photo: { data: Buffer.from(""), contentType: "image/png" },
      shipping: true,
    });

    const req = mockRequest({ pid: product.id });
    const res = mockResponse();

    await productPhotoController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Photo not found",
    });
  });

  it("should handle database errors gracefully", async () => {
    const req = mockRequest({ pid: "fake-id" });
    const res = mockResponse();

    const findByIdSpy = jest
      .spyOn(productModel, "findById")
      .mockImplementationOnce(() => {
        throw new Error("Database Error");
      });

    await productPhotoController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const responsePayload = (res.send as jest.Mock).mock.calls[0][0];
    expect(responsePayload.success).toBe(false);
    expect(responsePayload.message).toBe("Error while getting photo");

    findByIdSpy.mockRestore();
  });
});
