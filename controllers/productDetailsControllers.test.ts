import type { Request, Response } from "express";
import productModel from "../models/productModel";
import {
  getSingleProductController,
  productPhotoController,
  relatedProductController,
} from "./productController";

jest.mock("../models/categoryModel");

jest.mock("../models/productModel");
const mockFindOne = productModel.findOne as jest.Mock;
const mockFind = productModel.find as jest.Mock;
const mockFindById = productModel.findById as jest.Mock;

jest.mock("braintree", () => ({
  BraintreeGateway: jest.fn().mockImplementation(() => ({
    clientToken: { generate: jest.fn() },
    transaction: { sale: jest.fn() },
  })),
  Environment: { Sandbox: {} },
}));

jest.mock("../models/orderModel");

const resOf = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnThis();
  res.send = jest.fn().mockReturnThis();
  res.set = jest.fn().mockReturnThis();
  return res as Response;
};

describe("Product details controllers — spec-driven (these should fail until controllers improved)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* ---------------------- getSingleProductController ---------------------- */

  test("400 when slug is missing", async () => {
    const req = { params: {} } as unknown as Request;
    const res = resOf();
    await getSingleProductController(req, res);

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
    const res = resOf();
    await getSingleProductController(req, res);

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
    const res = resOf();
    await getSingleProductController(req, res);

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
    jest.spyOn(console, "log").mockImplementation(() => {});
    const chain = {
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockRejectedValue(new Error("db")),
    };
    mockFindOne.mockReturnValueOnce(chain as any);

    const req = { params: { slug: "x" } } as unknown as Request;
    const res = resOf();
    await getSingleProductController(req, res);

    expect(console.log).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while getting single product",
      error: expect.any(Error),
    });
  });

  /* ---------------------- relatedProductController (similar) ---------------------- */

  test("400 when pid or cid missing", async () => {
    const res = resOf();
    await relatedProductController(
      { params: { pid: "p", cid: undefined } } as any,
      res
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

    const res = resOf();
    await relatedProductController(
      { params: { pid: "pX", cid: "cY" } } as any,
      res
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
    jest.spyOn(console, "log").mockImplementation(() => {});
    const chain = {
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockRejectedValue(new Error("boom")),
    };
    mockFind.mockReturnValueOnce(chain as any);

    const res = resOf();
    await relatedProductController(
      { params: { pid: "p", cid: "c" } } as any,
      res
    );

    expect(console.error).toHaveBeenCalledWith(
      "Error getting related products:",
      expect.any(Error)
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while getting related products",
    });
  });

  /* ---------------------- productPhotoController ---------------------- */

  test("404 when product not found", async () => {
    const selectFn = jest.fn().mockResolvedValue(null);
    mockFindById.mockReturnValueOnce({ select: selectFn } as any);

    const res = resOf();
    await productPhotoController({ params: { pid: "none" } } as any, res);

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

    const res = resOf();
    await productPhotoController({ params: { pid: "p" } } as any, res);

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

    const res = resOf();
    await productPhotoController({ params: { pid: "p" } } as any, res);

    expect(res.set).toHaveBeenCalledWith(
      "Content-Type",
      "application/octet-stream"
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(buf);
  });

  test("500 on DB error with clean message", async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    const selectFn = jest.fn().mockRejectedValue(new Error("db"));
    mockFindById.mockReturnValueOnce({ select: selectFn } as any);

    const res = resOf();
    await productPhotoController({ params: { pid: "p" } } as any, res);

    expect(console.log).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while getting photo",
      error: expect.any(Error),
    });
  });
});
