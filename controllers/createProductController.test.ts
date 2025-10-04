import slugify from "slugify";
import categoryModel from "../models/categoryModel";
import { createCategoryController } from "./categoryController";

const mockSave = jest.fn();

jest.mock("slugify", () => jest.fn((s) => `slug-${String(s)}`), {
  virtual: true,
});

jest.mock(
  "../models/categoryModel",
  () => {
    const MockCategoryModel = jest.fn().mockImplementation(function (payload) {
      Object.assign(this, payload);
      this.save = mockSave;
      return this;
    });
    MockCategoryModel.findOne = jest.fn();
    return MockCategoryModel;
  },
  {
    virtual: true,
  }
);

describe("createCategoryController (thorough, focused)", () => {
  let res;
  let consoleSpy;

  const reqOf = (body = {}) => ({ body });
  const MockCategoryModel = categoryModel as unknown as jest.Mock;
  const mockFindOne = MockCategoryModel.findOne as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test("401 when name is missing; no DB calls", async () => {
    await createCategoryController(reqOf({}), res, undefined);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
    expect(mockFindOne).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });

  test("200 + success:true when duplicate exists (repo message preserved)", async () => {
    mockFindOne.mockResolvedValueOnce({ _id: "dup", name: "Phones" });

    await createCategoryController(reqOf({ name: "Phones" }), res, undefined);

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

    await createCategoryController(reqOf({ name: "Gadgets" }), res, undefined);

    expect(slugify).toHaveBeenCalledWith("Gadgets");
    expect(MockCategoryModel).toHaveBeenCalledWith({
      name: "Gadgets",
      slug: "slug-Gadgets",
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "new category created",
      category: saved,
    });
  });

  test("500 when lookup throws: returns repo-typo payload and logs", async () => {
    mockFindOne.mockRejectedValueOnce(new Error("db down"));

    await createCategoryController(reqOf({ name: "X" }), res, undefined);

    expect(consoleSpy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    // Keep the controller’s current (typo’d) shape:
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      errro: expect.any(Error), // controller should assign error here to avoid ReferenceError
      message: "Errro in Category",
    });
  });

  test("500 when save throws: returns repo-typo payload and logs", async () => {
    mockFindOne.mockResolvedValueOnce(null);
    mockSave.mockRejectedValueOnce(new Error("write failed"));

    await createCategoryController(reqOf({ name: "Books" }), res, undefined);

    expect(consoleSpy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      errro: expect.any(Error),
      message: "Errro in Category",
    });
  });

  test("does not construct/save when duplicate short-circuits", async () => {
    mockFindOne.mockResolvedValueOnce({ _id: "dup", name: "Phones" });

    await createCategoryController(reqOf({ name: "Phones" }), res, undefined);

    expect(MockCategoryModel).not.toHaveBeenCalledWith(
      expect.objectContaining({ slug: expect.any(String) })
    );
    expect(mockSave).not.toHaveBeenCalled();
  });

  test("happy-path call order: findOne → constructor → save → 201 (using built-in call order)", async () => {
    mockFindOne.mockResolvedValueOnce(null);
    const saved = { _id: "ok1", name: "Books", slug: "slug-Books" };
    mockSave.mockResolvedValueOnce(saved);

    await createCategoryController(reqOf({ name: "Books" }), res, undefined);

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
