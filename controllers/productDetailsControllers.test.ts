import type { Request, Response } from "express";

/* --- Virtual mocks for controller imports (TS -> .js paths) --- */
jest.doMock(
  "../models/categoryModel.js",
  () => ({ __esModule: true, default: {} }),
  { virtual: true }
);

const mockFindOne = jest.fn();
const mockFind = jest.fn();
const mockFindById = jest.fn();
const ProductModelMock = {
  findOne: mockFindOne,
  find: mockFind,
  findById: mockFindById,
} as any;

jest.doMock(
  "../models/productModel.js",
  () => ({ __esModule: true, default: ProductModelMock }),
  { virtual: true }
);

jest.doMock("braintree", () => ({
  __esModule: true,
  default: {
    BraintreeGateway: jest.fn().mockImplementation(() => ({
      clientToken: { generate: jest.fn() },
      transaction: { sale: jest.fn() },
    })),
    Environment: { Sandbox: {} },
  },
}));

jest.doMock(
  "../models/orderModel.js",
  () => ({ __esModule: true, default: jest.fn() }),
  { virtual: true }
);

const {
  getSingleProductController,
  realtedProductController, // keep name as in source, but our tests assert desired behavior
  productPhotoController,
} = require("./productController");

const resOf = () =>
  ({
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    set: jest.fn(),
  }) as unknown as Response;

describe("Product details controllers — spec-driven (these should fail until controllers improved)", () => {
  let res: ReturnType<typeof resOf>;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    res = resOf();
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => consoleSpy.mockRestore());

  /* ---------------------- getSingleProductController ---------------------- */

  test("400 when slug is missing", async () => {
    const req = { params: {} } as unknown as Request;
    await getSingleProductController(req, res, undefined as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "slug is required",
    });
  });

  test("404 when product not found", async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockResolvedValue(null),
    };
    mockFindOne.mockReturnValueOnce(chain as any);

    const req = { params: { slug: "missing" } } as unknown as Request;
    await getSingleProductController(req, res, undefined as any);

    expect(mockFindOne).toHaveBeenCalledWith({ slug: "missing" });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Product not found",
    });
  });

  test("200 success: returns normalized payload (no typos) and excludes photo", async () => {
    const product = {
      _id: "p1",
      slug: "ok",
      name: "N",
      description: "D",
      price: 1,
      category: { _id: "c", name: "Cat" },
    };
    const chain = {
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockResolvedValue(product),
    };
    mockFindOne.mockReturnValueOnce(chain as any);

    const req = { params: { slug: "ok" } } as unknown as Request;
    await getSingleProductController(req, res, undefined as any);

    expect(chain.select).toHaveBeenCalledWith("-photo");
    expect(chain.populate).toHaveBeenCalledWith("category");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Single product fetched",
      product,
    });
  });

  test("500 on DB error with clean message and error shape", async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockRejectedValue(new Error("db")),
    };
    mockFindOne.mockReturnValueOnce(chain as any);

    const req = { params: { slug: "x" } } as unknown as Request;
    await getSingleProductController(req, res, undefined as any);

    expect(consoleSpy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while getting single product",
      error: expect.any(Error),
    });
  });

  /* ---------------------- realtedProductController (similar) ---------------------- */

  test("400 when pid or cid missing", async () => {
    await realtedProductController(
      { params: { pid: "p", cid: undefined } } as any,
      res,
      undefined as any
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Both pid and cid are required",
    });
  });

  test("200 success: uses $ne, select, limit(3), populate and returns products[]", async () => {
    const products = [{ _id: "r1" }, { _id: "r2" }, { _id: "r3" }];
    const chain = {
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockResolvedValue(products),
    };
    mockFind.mockReturnValueOnce(chain as any);

    await realtedProductController(
      { params: { pid: "pX", cid: "cY" } } as any,
      res,
      undefined as any
    );

    expect(mockFind).toHaveBeenCalledWith({
      category: "cY",
      _id: { $ne: "pX" },
    });
    expect(chain.select).toHaveBeenCalledWith("-photo");
    expect(chain.limit).toHaveBeenCalledWith(3);
    expect(chain.populate).toHaveBeenCalledWith("category");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, products });
  });

  test("500 on DB error with clean message (no typos)", async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockRejectedValue(new Error("boom")),
    };
    mockFind.mockReturnValueOnce(chain as any);

    await realtedProductController(
      { params: { pid: "p", cid: "c" } } as any,
      res,
      undefined as any
    );

    expect(consoleSpy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while getting related products",
      error: expect.any(Error),
    });
  });

  /* ---------------------- productPhotoController ---------------------- */

  test("404 when product not found", async () => {
    const selectFn = jest.fn().mockResolvedValue(null);
    mockFindById.mockReturnValueOnce({ select: selectFn } as any);

    await productPhotoController(
      { params: { pid: "none" } } as any,
      res,
      undefined as any
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Product not found",
    });
  });

  test("404 when no photo data present", async () => {
    const doc = { photo: { data: undefined, contentType: "image/png" } };
    const selectFn = jest.fn().mockResolvedValue(doc);
    mockFindById.mockReturnValueOnce({ select: selectFn } as any);

    await productPhotoController(
      { params: { pid: "p" } } as any,
      res,
      undefined as any
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Photo not found",
    });
  });

  test("200 when photo present; defaults content type when missing", async () => {
    const buf = Buffer.from([1, 2, 3]);
    const doc = { photo: { data: buf, contentType: undefined } };
    const selectFn = jest.fn().mockResolvedValue(doc);
    mockFindById.mockReturnValueOnce({ select: selectFn } as any);

    await productPhotoController(
      { params: { pid: "p" } } as any,
      res,
      undefined as any
    );

    expect(res.set).toHaveBeenCalledWith(
      "Content-type",
      "application/octet-stream"
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(buf);
  });

  test("500 on DB error with clean message", async () => {
    const selectFn = jest.fn().mockRejectedValue(new Error("db"));
    mockFindById.mockReturnValueOnce({ select: selectFn } as any);

    await productPhotoController(
      { params: { pid: "p" } } as any,
      res,
      undefined as any
    );

    expect(consoleSpy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while getting photo",
      error: expect.any(Error),
    });
  });
});
