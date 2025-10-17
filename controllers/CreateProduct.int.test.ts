import type { Request, Response } from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import fs from "fs";
import path from "path";
import slugify from "slugify";

import { createProductController } from "./productController";
import productModel from "../models/productModel";

jest.mock("braintree", () => ({
  BraintreeGateway: jest.fn().mockImplementation(() => ({})),
  Environment: { Sandbox: "Sandbox" },
}));

let mongo: MongoMemoryServer;

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

function reqOf(fields: any = {}, files: any = {}): Request {
  return { fields, files } as unknown as Request;
}

async function clearDB() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: "testdb" });
  await productModel.init();
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

describe("createProductController (integration)", () => {
  test("500 when name missing", async () => {
    const res = mockResponse();
    await createProductController(
      reqOf({
        description: "d",
        price: 10,
        category: new mongoose.Types.ObjectId().toString(),
        quantity: 1,
      }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
    expect(await productModel.countDocuments()).toBe(0);
  });

  test("500 when description missing", async () => {
    const res = mockResponse();
    await createProductController(
      reqOf({
        name: "Phone",
        price: 10,
        category: new mongoose.Types.ObjectId().toString(),
        quantity: 1,
      }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Description is Required" });
  });

  test("500 when price missing", async () => {
    const res = mockResponse();
    await createProductController(
      reqOf({
        name: "Phone",
        description: "nice",
        category: new mongoose.Types.ObjectId().toString(),
        quantity: 1,
      }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Price is Required" });
  });

  test("500 when category missing", async () => {
    const res = mockResponse();
    await createProductController(
      reqOf({ name: "Phone", description: "nice", price: 10, quantity: 1 }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Category is Required" });
  });

  test("500 when quantity missing", async () => {
    const res = mockResponse();
    await createProductController(
      reqOf({
        name: "Phone",
        description: "nice",
        price: 10,
        category: new mongoose.Types.ObjectId().toString(),
      }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Quantity is Required" });
  });

  test("500 when photo > 1MB", async () => {
    const res = mockResponse();
    await createProductController(
      reqOf(
        {
          name: "Phone",
          description: "nice",
          price: 10,
          category: new mongoose.Types.ObjectId().toString(),
          quantity: 3,
        },
        { photo: { size: 1000001, path: "ignored", type: "image/png" } }
      ),
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      error: "photo is Required and should be less then 1mb",
    });
  });

  test("201 success without photo: persists to DB and slugifies", async () => {
    const res = mockResponse();
    const catId = new mongoose.Types.ObjectId().toString();

    await createProductController(
      reqOf({
        name: "Phone X",
        description: "nice",
        price: 10,
        category: catId,
        quantity: 3,
        shipping: true,
      }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(201);

    const payload = res.send.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.message).toBe("Product Created Successfully");
    expect(payload.products).toBeDefined();

    const saved = await productModel.find({});
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("Phone X");
    expect(saved[0].description).toBe("nice");
    expect(saved[0].price).toBe(10);
    expect(String(saved[0].category)).toBe(catId);
    expect(saved[0].quantity).toBe(3);
    expect(saved[0].slug.toLowerCase()).toBe(
      slugify("Phone X", { lower: true })
    );
  });

  test("201 success with photo: reads file and sets photo fields", async () => {
    const res = mockResponse();
    const tmpDir = path.join(process.cwd(), ".jest-tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
    const tmpFile = path.join(tmpDir, "img.png");
    fs.writeFileSync(tmpFile, Buffer.from([0x89, 0x50, 0x4e, 0x47])); // small PNG header

    const catId = new mongoose.Types.ObjectId().toString();

    await createProductController(
      reqOf(
        {
          name: "Camera",
          description: "dslr",
          price: 999,
          category: catId,
          quantity: 1,
          shipping: false,
        },
        {
          photo: {
            size: fs.statSync(tmpFile).size,
            path: tmpFile,
            type: "image/png",
          },
        }
      ),
      res
    );

    expect(res.status).toHaveBeenCalledWith(201);

    const saved = await productModel
      .findOne({ name: "Camera" })
      .select("+photo");
    expect(saved).toBeTruthy();
    expect(Buffer.isBuffer(saved!.photo?.data)).toBe(true);
    expect((saved!.photo?.data as Buffer).length).toBeGreaterThan(0);
    expect(saved!.photo?.contentType).toBe("image/png");

    fs.unlinkSync(tmpFile);
    if (fs.existsSync(tmpDir) && fs.readdirSync(tmpDir).length === 0)
      fs.rmdirSync(tmpDir);
  });

  test("500 when fs.readFileSync throws (bad path)", async () => {
    const res = mockResponse();
    const catId = new mongoose.Types.ObjectId().toString();

    await createProductController(
      reqOf(
        {
          name: "Laptop",
          description: "ultrabook",
          price: 1500,
          category: catId,
          quantity: 2,
        },
        {
          photo: {
            size: 10,
            path: path.join(process.cwd(), "no_such_file.png"),
            type: "image/png",
          },
        }
      ),
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: expect.anything(),
      message: "Error in creating product",
    });
    expect(await productModel.countDocuments({ name: "Laptop" })).toBe(0);
  });
});
