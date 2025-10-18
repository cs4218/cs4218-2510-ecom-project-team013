import { Request, Response } from "express";
import fs from "fs";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { updateProductController } from "../controllers/productController";
import categoryModel from "../models/categoryModel";
import productModel from "../models/productModel";

const mockRequest = (params = {}, fields = {}, files = {}) => {
  return {
    params,
    fields,
    files,
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

describe("Integration Test for UpdateProductController", () => {
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

  it("should update product successfully without photo", async () => {
    const req = mockRequest(
      { pid: seededProducts[0].id.toString() },
      {
        name: "Updated Product",
        description: "New Description",
        price: 150,
        category: seededCategories[1].id.toString(),
        quantity: 20,
        shipping: false,
      }
    );
    const res = mockResponse();

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.send as jest.Mock).mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.product.name).toBe("Updated Product");
  });

  it("should return 404 if product not found", async () => {
    const req = mockRequest(
      { pid: new mongoose.Types.ObjectId().toString() },
      {
        name: "Nonexistent",
        description: "New Description",
        price: 150,
        category: seededCategories[1].id.toString(),
        quantity: 20,
        shipping: false,
      }
    );
    const res = mockResponse();

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    const payload = (res.send as jest.Mock).mock.calls[0][0];
    expect(payload.message).toBe("Product not found");
  });

  it("should reject if photo size exceeds 1MB", async () => {
    const req = mockRequest(
      { pid: seededProducts[0].id.toString() },
      {
        name: "Big Photo Product",
        description: "New Description",
        price: 150,
        category: seededCategories[1].id.toString(),
        quantity: 20,
        shipping: false,
      },
      { photo: { size: 2_000_000, path: "fake", type: "image/png" } }
    );
    const res = mockResponse();

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.send as jest.Mock).mock.calls[0][0];
    expect(payload.message).toBe("Photo should be less than 1MB");
  });

  it("should handle missing required fields", async () => {
    const req = mockRequest({ pid: seededProducts[0].id.toString() }, {});
    const res = mockResponse();

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.send as jest.Mock).mock.calls[0][0];
    expect(payload.success).toBe(false);
    expect(payload.message).toBe("Name is Required");
  });

  it("should attach new photo and save it", async () => {
    const mockBuffer = Buffer.from("new image data");
    jest.spyOn(fs, "readFileSync").mockReturnValueOnce(mockBuffer);

    const req = mockRequest(
      { pid: seededProducts[0].id.toString() },
      {
        name: "Updated Product",
        description: "New Description",
        price: 150,
        category: seededCategories[1].id.toString(),
        quantity: 20,
        shipping: false,
      },
      { photo: { size: 5000, path: "/fake/path.png", type: "image/png" } }
    );
    const res = mockResponse();

    await updateProductController(req, res);

    expect(fs.readFileSync).toHaveBeenCalledWith("/fake/path.png");
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.send as jest.Mock).mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.product.photo.data.equals(mockBuffer)).toBe(true);
  });

  it("should handle internal server error", async () => {
    const findSpy = jest
      .spyOn(productModel, "findByIdAndUpdate")
      .mockImplementationOnce(() => {
        throw new Error("Database failure");
      });

    const req = mockRequest(
      { pid: seededProducts[0].id.toString() },
      {
        name: "Updated Product",
        description: "New Description",
        price: 150,
        category: seededCategories[1].id.toString(),
        quantity: 20,
        shipping: false,
      }
    );
    const res = mockResponse();

    await updateProductController(req, res);

    expect(findSpy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    const payload = (res.send as jest.Mock).mock.calls[0][0];
    expect(payload.message).toBe("Error in Update product");
  });
});
