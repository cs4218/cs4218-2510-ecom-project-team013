import type { Request, Response } from "express";
import slugify from "slugify";
import categoryModel from "../models/categoryModel";
import { createCategoryController } from "./categoryController";

const mockSave = jest.fn();
const mockFindOne = jest.fn();
const mockCategoryModel = jest.fn().mockImplementation(function (
  this: any,
  payload: any
) {
  this.payload = payload;
  this.save = mockSave;
  return this;
});
(mockCategoryModel as any).findOne = mockFindOne;

jest.mock(
  "slugify",
  () => ({
    __esModule: true,
    default: jest.fn((s: string) => `slug-${String(s).trim().toLowerCase()}`),
  }),
  { virtual: true }
);

jest.mock(
  "../models/categoryModel.js",
  () => ({
    __esModule: true,
    default: mockCategoryModel,
  }),
  { virtual: true }
);

const { createCategoryController } = require("./categoryController");
const slugify = require("slugify").default as (s: string) => string;

describe("createCategoryController — spec-driven", () => {
  let res: Response & { status: jest.Mock; send: jest.Mock };
  let consoleSpy: jest.SpyInstance;

  const reqOf = (body: any = {}): Request => ({ body }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
    res = { status: jest.fn().mockReturnThis(), send: jest.fn() } as any;
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => consoleSpy.mockRestore());

  test("400 when name is missing", async () => {
    await createCategoryController(reqOf({}), res, undefined as any);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Name is required",
    });
    expect(mockFindOne).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });

  test("400 when name is blank (after trim)", async () => {
    await createCategoryController(
      reqOf({ name: "   " }),
      res,
      undefined as any
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Name is required",
    });
  });

  test("400 when name is not a string", async () => {
    await createCategoryController(
      reqOf({ name: 42 as any }),
      res,
      undefined as any
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Name must be a string",
    });
  });

  test("409 when duplicate exists (case-insensitive), success:false", async () => {
    (mockFindOne as jest.Mock).mockResolvedValueOnce({
      _id: "id1",
      name: "Phones",
    });
    await createCategoryController(
      reqOf({ name: "phones" }),
      res,
      undefined as any
    );
    expect(mockFindOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Category already exists",
    });
    expect(mockSave).not.toHaveBeenCalled();
  });

  test("201 on success: trims, slugifies, returns created doc", async () => {
    (mockFindOne as jest.Mock).mockResolvedValueOnce(null);
    const saved = { _id: "new1", name: "Gadgets", slug: "slug-gadgets" };
    (mockSave as jest.Mock).mockResolvedValueOnce(saved);

    await createCategoryController(
      reqOf({ name: "  Gadgets  " }),
      res,
      undefined as any
    );

    expect(slugify).toHaveBeenCalledWith("Gadgets");
    expect(mockCategoryModel).toHaveBeenCalledWith({
      name: "Gadgets",
      slug: "slug-gadgets",
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Category created",
      category: saved,
    });
  });

  test("500 when lookup throws: returns error payload", async () => {
    (mockFindOne as jest.Mock).mockRejectedValueOnce(new Error("db down"));
    await createCategoryController(reqOf({ name: "X" }), res, undefined as any);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error creating category",
      error: "db down",
    });
  });

  test("500 when save throws: returns error payload", async () => {
    (mockFindOne as jest.Mock).mockResolvedValueOnce(null);
    (mockSave as jest.Mock).mockRejectedValueOnce(new Error("write failed"));
    await createCategoryController(reqOf({ name: "Y" }), res, undefined as any);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error creating category",
      error: "write failed",
    });
  });
});

jest.mock("slugify", () => jest.fn((s) => `slug-${String(s)}`));

jest.mock("../models/categoryModel", () => {
  const mockSave = jest.fn();
  const MockCategoryModel = jest.fn().mockImplementation(function (
    this: any,
    payload
  ) {
    Object.assign(this, payload);
    this.save = mockSave;
    return this;
  });
  (MockCategoryModel as any).findOne = jest.fn();
  // To expose it for testing;
  (MockCategoryModel as any).save = mockSave;
  return MockCategoryModel;
});

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnThis();
  res.send = jest.fn().mockReturnThis();
  return res as Response;
};

const reqOf = (body: Record<string, unknown> = {}) => ({ body }) as Request;
const mockFindOne = categoryModel.findOne as jest.Mock;
const mockSave = (categoryModel as any).save as jest.Mock;

describe("createCategoryController (thorough, focused)", () => {
  const MockCategoryModel = categoryModel as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("401 when name is missing; no DB calls", async () => {
    const res = mockResponse();
    await createCategoryController(reqOf({}), res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
    expect(mockFindOne).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });

  test("200 + success:true when duplicate exists (repo message preserved)", async () => {
    mockFindOne.mockResolvedValueOnce({ _id: "dup", name: "Phones" });

    const res = mockResponse();
    await createCategoryController(reqOf({ name: "Phones" }), res);

    expect(mockFindOne).toHaveBeenCalledWith({ name: "Phones" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Category Already Exists",
    });
    expect(mockSave).not.toHaveBeenCalled();
  });

  test("201 on success: slugify called, model created with slug, returns saved doc", async () => {
    mockFindOne.mockResolvedValueOnce(null);
    const saved = { _id: "n1", name: "Gadgets", slug: "slug-Gadgets" };
    mockSave.mockResolvedValueOnce(saved);

    const res = mockResponse();
    await createCategoryController(reqOf({ name: "Gadgets" }), res);

    expect(slugify).toHaveBeenCalledWith("Gadgets");
    expect(MockCategoryModel).toHaveBeenCalledWith({
      name: "Gadgets",
      slug: "slug-Gadgets",
    });
    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "new category created",
      category: saved,
    });
  });

  test("500 when lookup throws: returns repo-typo payload and logs", async () => {
    jest.spyOn(console, "log");
    mockFindOne.mockRejectedValueOnce(new Error("db down"));

    const res = mockResponse();
    await createCategoryController(reqOf({ name: "X" }), res);
    expect(console.log).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    // Keep the controller’s current (typo’d) shape:
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: expect.any(Error), // controller should assign error here to avoid ReferenceError
      message: "Error in Category",
    });
  });

  test("500 when save throws: returns repo-typo payload and logs", async () => {
    jest.spyOn(console, "log");
    mockFindOne.mockResolvedValueOnce(null);
    mockSave.mockRejectedValueOnce(new Error("write failed"));

    const res = mockResponse();
    await createCategoryController(reqOf({ name: "Books" }), res);

    expect(console.log).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: expect.any(Error),
      message: "Error in Category",
    });
  });

  test("does not construct/save when duplicate short-circuits", async () => {
    mockFindOne.mockResolvedValueOnce({ _id: "dup", name: "Phones" });

    const res = mockResponse();
    await createCategoryController(reqOf({ name: "Phones" }), res);

    expect(MockCategoryModel).not.toHaveBeenCalledWith(
      expect.objectContaining({ slug: expect.any(String) })
    );
    expect(mockSave).not.toHaveBeenCalled();
  });

  test("happy-path call order: findOne → constructor → save → 201 (using built-in call order)", async () => {
    mockFindOne.mockResolvedValueOnce(null);
    const saved = { _id: "ok1", name: "Books", slug: "slug-Books" };
    mockSave.mockResolvedValueOnce(saved);

    const res = mockResponse();
    await createCategoryController(reqOf({ name: "Books" }), res);

    expect(mockFindOne).toHaveBeenCalledTimes(1);
    expect(MockCategoryModel).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledTimes(1);

    const findOneOrder = mockFindOne.mock.invocationCallOrder[0];
    const ctorOrder = MockCategoryModel.mock.invocationCallOrder[0];
    const saveOrder = mockSave.mock.invocationCallOrder[0];

    expect(findOneOrder).toBeLessThan(ctorOrder);
    expect(ctorOrder).toBeLessThan(saveOrder);

    expect(res.status).toHaveBeenCalledWith(201);
  });
});
