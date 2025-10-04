import type { Request, Response } from "express";
import slugify from "slugify";
import categoryModel from "../models/categoryModel";
import { createCategoryController } from "./categoryController";

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
