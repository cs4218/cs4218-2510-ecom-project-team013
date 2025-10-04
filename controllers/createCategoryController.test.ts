import type { Request, Response } from "express";
import slugify from "slugify";
import categoryModel from "../models/categoryModel";
import { createCategoryController } from "./categoryController";

jest.mock("slugify", () =>
  jest.fn((s: string) => `slug-${String(s).trim().toLowerCase()}`)
);

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

describe("createCategoryController — spec-driven", () => {
  const MockCategoryModel = categoryModel as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("400 when name is missing", async () => {
    const res = mockResponse();
    await createCategoryController(reqOf({}), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Name is required",
    });
    expect(mockFindOne).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });

  test("400 when name is blank (after trim)", async () => {
    const res = mockResponse();
    await createCategoryController(reqOf({ name: "   " }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Name is required",
    });
  });

  test("400 when name is not a string", async () => {
    const res = mockResponse();
    await createCategoryController(reqOf({ name: 42 as any }), res);
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
    const res = mockResponse();
    await createCategoryController(reqOf({ name: "phones" }), res);
    expect(mockFindOne).toHaveBeenCalledTimes(1);
    expect(mockFindOne).toHaveBeenCalledWith({ name: { $regex: /^phones$/i } });
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Category already exists",
    });
    expect(mockSave).not.toHaveBeenCalled();
  });

  test("201 on success: trims, slugifies, returns created doc", async () => {
    mockFindOne.mockResolvedValueOnce(null);
    const saved = { _id: "new1", name: "Gadgets", slug: "slug-gadgets" };
    mockSave.mockResolvedValueOnce(saved);

    const res = mockResponse();
    await createCategoryController(reqOf({ name: "  Gadgets  " }), res);

    expect(slugify).toHaveBeenCalledWith("Gadgets");
    expect(MockCategoryModel).toHaveBeenCalledWith({
      name: "Gadgets",
      slug: "slug-gadgets",
    });
    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Category created",
      category: saved,
    });
  });

  test("500 when lookup throws: returns error payload", async () => {
    (mockFindOne as jest.Mock).mockRejectedValueOnce(new Error("db down"));
    const res = mockResponse();
    await createCategoryController(reqOf({ name: "X" }), res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error creating category",
      error: "db down",
    });
  });

  test("500 when lookup throws: returns repo-typo payload and logs", async () => {
    jest.spyOn(console, "log");
    mockFindOne.mockRejectedValueOnce(new Error("db down"));

    const res = mockResponse();
    await createCategoryController(reqOf({ name: "X" }), res);
    expect(console.log).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: "db down",
      message: "Error creating category",
    });
  });

  test("500 when save throws: returns error payload", async () => {
    jest.spyOn(console, "log");
    mockFindOne.mockResolvedValueOnce(null);
    mockSave.mockRejectedValueOnce(new Error("write failed"));

    const res = mockResponse();
    await createCategoryController(reqOf({ name: "Y" }), res);

    expect(console.log).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error creating category",
      error: "write failed",
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

  test("409 duplicate when name has regex metacharacters", async () => {
    (mockFindOne as jest.Mock).mockResolvedValueOnce({
      _id: "id1",
      name: "C++",
    });
    const res = mockResponse();
    await createCategoryController(reqOf({ name: "C++" }), res);
    expect(mockFindOne).toHaveBeenCalledWith({
      name: { $regex: /^C\+\+$/i }, // or new RegExp('^C\\+\\+$','i')
    });
    expect(res.status).toHaveBeenCalledWith(409);
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
