import type { Request, Response } from "express";

jest.mock("braintree", () => ({
  __esModule: true,
  default: {
    BraintreeGateway: jest.fn().mockImplementation(() => ({})),
    Environment: { Sandbox: "Sandbox" },
  },
}));

const mockProductSave = jest.fn();

const MockProductModel = jest.fn().mockImplementation(function (
  this: any,
  payload: any
) {
  Object.assign(this, payload);
  // ensure .photo exists like in mongoose schema shape
  this.photo = this.photo || {};
  this.save = mockProductSave;
  return this;
});

jest.mock(
  "../models/productModel",
  () => ({
    __esModule: true,
    default: MockProductModel,
  }),
  { virtual: true }
);

jest.mock(
  "slugify",
  () => ({
    __esModule: true,
    default: jest.fn((s: string) => `slug-${String(s)}`),
  }),
  { virtual: true }
);

// The controller imports `fs` as a default import then calls `fs.readFileSync(...)`.
// So provide a default export that has readFileSync.
jest.mock(
  "fs",
  () => {
    const readFileSync = jest.fn();
    return {
      __esModule: true,
      default: { readFileSync },
      readFileSync, // also expose at module root (harmless; keeps flexibility)
    };
  },
  { virtual: true }
);

// Now require after mocks are set up
const { createProductController } = require("./productController");
const slugify = require("slugify").default as (s: string) => string;
const fs = require("fs") as { readFileSync: jest.Mock };

describe("createProductController", () => {
  let res: Response & { status: jest.Mock; send: jest.Mock };
  const reqOf = (fields: any = {}, files: any = {}) =>
    ({ fields, files }) as unknown as Request;

  beforeEach(() => {
    jest.clearAllMocks();
    res = { status: jest.fn().mockReturnThis(), send: jest.fn() } as any;
  });

  // ---- Validation cases (switch(true)) ----
  test("500 when name missing", async () => {
    await createProductController(
      reqOf({ description: "d", price: 10, category: "c", quantity: 1 }),
      res,
      undefined as any
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
  });

  test("500 when description missing", async () => {
    await createProductController(
      reqOf({ name: "N", price: 10, category: "c", quantity: 1 }),
      res,
      undefined as any
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      error: "Description is Required",
    });
  });

  test("500 when price missing", async () => {
    await createProductController(
      reqOf({ name: "N", description: "d", category: "c", quantity: 1 }),
      res,
      undefined as any
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Price is Required" });
  });

  test("500 when category missing", async () => {
    await createProductController(
      reqOf({ name: "N", description: "d", price: 1, quantity: 1 }),
      res,
      undefined as any
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      error: "Category is Required",
    });
  });

  test("500 when quantity missing", async () => {
    await createProductController(
      reqOf({ name: "N", description: "d", price: 1, category: "c" }),
      res,
      undefined as any
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      error: "Quantity is Required",
    });
  });

  test("500 when photo > 1MB", async () => {
    const big = { size: 1000001, path: "p", type: "image/png" };
    await createProductController(
      reqOf(
        { name: "N", description: "d", price: 1, category: "c", quantity: 1 },
        { photo: big }
      ),
      res,
      undefined as any
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      error: "photo is Required and should be less then 1mb",
    });
  });

  // ---- Happy paths ----
  test("201 success without photo", async () => {
    mockProductSave.mockResolvedValueOnce(undefined);
    await createProductController(
      reqOf({
        name: "Phone",
        description: "nice",
        price: 10,
        category: "g",
        quantity: 3,
        shipping: true,
      }),
      res,
      undefined as any
    );

    expect(MockProductModel).toHaveBeenCalledWith({
      name: "Phone",
      description: "nice",
      price: 10,
      category: "g",
      quantity: 3,
      shipping: true,
      slug: "slug-Phone",
    });
    expect(slugify).toHaveBeenCalledWith("Phone");

    const instance = (MockProductModel as jest.Mock).mock.instances[0];
    expect(mockProductSave).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Product Created Successfully",
      products: instance,
    });
  });

  test("201 success with photo: reads file and sets contentType", async () => {
    fs.readFileSync.mockReturnValueOnce(Buffer.from("IMG"));
    mockProductSave.mockResolvedValueOnce(undefined);

    const photo = { size: 999999, path: "C:\\img.png", type: "image/png" };
    await createProductController(
      reqOf(
        {
          name: "Phone",
          description: "nice",
          price: 10,
          category: "g",
          quantity: 3,
        },
        { photo }
      ),
      res,
      undefined as any
    );

    const instance = (MockProductModel as jest.Mock).mock.instances[0];
    expect(fs.readFileSync).toHaveBeenCalledWith("C:\\img.png");
    expect(instance.photo.data).toBeInstanceOf(Buffer);
    expect(instance.photo.contentType).toBe("image/png");
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // ---- Error paths ----
  test("500 when fs.readFileSync throws", async () => {
    fs.readFileSync.mockImplementationOnce(() => {
      throw new Error("fs fail");
    });
    await createProductController(
      reqOf(
        {
          name: "Phone",
          description: "nice",
          price: 10,
          category: "g",
          quantity: 3,
        },
        { photo: { size: 10, path: "p", type: "t" } }
      ),
      res,
      undefined as any
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: expect.any(Error),
      message: "Error in creating product",
    });
  });

  test("500 when save throws", async () => {
    fs.readFileSync.mockReturnValueOnce(Buffer.from("IMG"));
    mockProductSave.mockRejectedValueOnce(new Error("write failed"));

    await createProductController(
      reqOf(
        {
          name: "Phone",
          description: "nice",
          price: 10,
          category: "g",
          quantity: 3,
        },
        { photo: { size: 10, path: "p", type: "t" } }
      ),
      res,
      undefined as any
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: expect.any(Error),
      message: "Error in creating product",
    });
  });
});
