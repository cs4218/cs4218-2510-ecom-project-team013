import type { Request, Response } from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import slugify from "slugify";
import categoryModel from "../models/categoryModel";
import { createCategoryController } from "./categoryController";

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
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  await mongoose.connect(uri, { dbName: "testdb" });
  await categoryModel.init();
});

afterEach(async () => {
  await clearDB();
  jest.clearAllMocks();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongo.stop();
});

describe("createCategoryController (integration, no supertest)", () => {
  test("400 when name is missing", async () => {
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

  test("400 when name is blank after trim", async () => {
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

  test("400 when name is not a string", async () => {
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

  test("201 when created: trims name and slugifies; persists to DB", async () => {
    const req = mockRequest({ name: "  Gadgets  " });
    const res = mockResponse();
    await createCategoryController(req, res);
    expect(res.status).toHaveBeenCalledWith(201);

    const payload = res.send.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.message).toBe("Category created");
    expect(payload.category).toBeDefined();

    const cat =
      payload?.category && typeof payload.category.toObject === "function"
        ? payload.category.toObject()
        : payload.category;

    const expectedSlug = slugify("Gadgets", { lower: true });
    expect(cat).toMatchObject({ name: "Gadgets", slug: expectedSlug });

    const docs = await categoryModel.find({});
    expect(docs).toHaveLength(1);
    expect(docs[0].name).toBe("Gadgets");
    expect(docs[0].slug).toBe(expectedSlug);
  });

  test("409 when duplicate exists (case-insensitive)", async () => {
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

  test("handles regex metacharacters (duplicate 'C++') → 409", async () => {
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

  test("500 path: if DB lookup throws, responds with error payload", async () => {
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
