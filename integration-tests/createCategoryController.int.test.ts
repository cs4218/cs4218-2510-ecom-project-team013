import type { Request, Response } from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import slugify from "slugify";
import { createCategoryController } from "../controllers/categoryController";
import categoryModel from "../models/categoryModel";

// Mock braintree to avoid initialization errors
jest.mock("braintree", () => {
  return {
    BraintreeGateway: jest.fn().mockImplementation(() => ({})),
    Environment: { Sandbox: "Sandbox", Production: "Production" },
  };
});

let mongo: MongoMemoryServer;

function mockRequest(body: Record<string, unknown> = {}): Request {
  return { body } as unknown as Request;
}

function mockResponse() {
  const res: Partial<Response> = {};
  (res as any).status = jest.fn().mockReturnThis();
  (res as any).send = jest.fn().mockReturnThis();
  (res as any).json = jest.fn().mockReturnThis();
  return res as Response & {
    status: jest.Mock;
    send: jest.Mock;
    json: jest.Mock;
  };
}

async function clearDB() {
  const collections = await mongoose.connection.db?.collections();
  if (collections) {
    await Promise.all(collections.map((c) => c.deleteMany({})));
  }
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  await mongoose.connect(uri, { dbName: "testdb" });
  await categoryModel.init();
}, 30000);

afterEach(async () => {
  await clearDB();
  jest.clearAllMocks();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongo.stop();
});

describe("Integration Tests: createCategoryController", () => {
  describe("Successful category creation", () => {
    test("should create category with valid name", async () => {
      const req = mockRequest({ name: "Electronics" });
      const res = mockResponse();
      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const payload = res.send.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.message).toBe("Category created");
      expect(payload.category).toBeDefined();

      // Verify database persistence
      const docs = await categoryModel.find({});
      expect(docs).toHaveLength(1);
      expect(docs[0].name).toBe("Electronics");
      expect(docs[0].slug).toBe(slugify("Electronics", { lower: true }));
    });

    test("should trim name and slugify correctly", async () => {
      const req = mockRequest({ name: "  Gadgets  " });
      const res = mockResponse();
      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const payload = res.send.mock.calls[0][0];

      const cat =
        payload?.category && typeof payload.category.toObject === "function"
          ? payload.category.toObject()
          : payload.category;

      const expectedSlug = slugify("Gadgets", { lower: true });
      expect(cat).toMatchObject({ name: "Gadgets", slug: expectedSlug });

      // Verify database
      const docs = await categoryModel.find({});
      expect(docs).toHaveLength(1);
      expect(docs[0].name).toBe("Gadgets");
      expect(docs[0].slug).toBe(expectedSlug);
    });

    test("should handle special characters in name", async () => {
      const req = mockRequest({ name: "Books & Magazines" });
      const res = mockResponse();
      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const docs = await categoryModel.find({});
      expect(docs).toHaveLength(1);
      expect(docs[0].name).toBe("Books & Magazines");
    });
  });

  describe("Validation errors", () => {
    test("should return 400 when name is missing", async () => {
      const req = mockRequest({});
      const res = mockResponse();
      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Name is required",
      });
      const docs = await categoryModel.find({});
      expect(docs).toHaveLength(0);
    });

    test("should return 400 when name is blank after trim", async () => {
      const req = mockRequest({ name: "   " });
      const res = mockResponse();
      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Name is required",
      });
      const docs = await categoryModel.find({});
      expect(docs).toHaveLength(0);
    });

    test("should return 400 when name is not a string", async () => {
      const req = mockRequest({ name: 42 as any });
      const res = mockResponse();
      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Name must be a string",
      });
      const docs = await categoryModel.find({});
      expect(docs).toHaveLength(0);
    });

    test("should return 400 when name is null", async () => {
      const req = mockRequest({ name: null as any });
      const res = mockResponse();
      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Name is required",
      });
    });
  });

  describe("Duplicate category detection", () => {
    test("should return 409 when duplicate exists (case-insensitive)", async () => {
      await categoryModel.create({
        name: "Phones",
        slug: slugify("Phones", { lower: true }),
      });

      const req = mockRequest({ name: "phones" });
      const res = mockResponse();
      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Category already exists",
      });

      const docs = await categoryModel.find({});
      expect(docs).toHaveLength(1);
      expect(docs[0].name).toBe("Phones");
    });

    test("should handle regex metacharacters correctly (C++)", async () => {
      await categoryModel.create({
        name: "C++",
        slug: slugify("C++", { lower: true }),
      });

      const req = mockRequest({ name: "C++" });
      const res = mockResponse();
      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Category already exists",
      });

      const docs = await categoryModel.find({});
      expect(docs).toHaveLength(1);
      expect(docs[0].name).toBe("C++");
    });

    test("should detect duplicate with different casing", async () => {
      await categoryModel.create({
        name: "Electronics",
        slug: slugify("Electronics", { lower: true }),
      });

      const req = mockRequest({ name: "ELECTRONICS" });
      const res = mockResponse();
      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe("Error handling", () => {
    test("should return 500 when database operation fails", async () => {
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      const spy = jest
        .spyOn(categoryModel, "findOne")
        .mockRejectedValueOnce(new Error("db down"));

      const req = mockRequest({ name: "X" });
      const res = mockResponse();
      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error creating category",
          error: "db down",
        })
      );

      spy.mockRestore();
      logSpy.mockRestore();
    });
  });
});
