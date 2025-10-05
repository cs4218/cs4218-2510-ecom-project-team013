import type { Request, Response } from "express";
import productModel from "../models/productModel";
import categoryModel from "../models/categoryModel";
import { productCategoryController } from "./productController";

// mock the models
jest.mock("../models/productModel");
jest.mock("../models/categoryModel");

// mock braintee - payment
jest.mock("braintree", () => {
  return {
    BraintreeGateway: jest.fn().mockImplementation(() => ({})),
    Environment: { Sandbox: "Sandbox", Production: "Production" },
  };
});

// =====================================================
// ProductCategoryController
// =====================================================

const mockRequest = () => {
  const req: Partial<Request> = {
    params: { slug: "electronics" },
  };
  return req as Request;
};

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnThis();
  res.send = jest.fn().mockReturnThis();
  return res as Response;
};

describe("productCategoryController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return products and category when successful", async () => {
    const mockCategory = {
      _id: "1",
      name: "Electronics",
      slug: "electronics",
    } as any;
    const mockProducts = [
      { _id: "1", name: "Product 1", category: mockCategory },
      { _id: "2", name: "Product 2", category: mockCategory },
    ] as any;

    (categoryModel.findOne as jest.Mock).mockResolvedValue(mockCategory);
    (productModel.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockProducts),
    });

    const mockReq = mockRequest();
    const mockRes = mockResponse();
    await productCategoryController(mockReq, mockRes);

    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "electronics" });
    expect(productModel.find).toHaveBeenCalledWith({ category: mockCategory });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      category: mockCategory,
      products: mockProducts,
    });
  });

  it("should return 400 if categoryModel.findOne throws an error", async () => {
    (categoryModel.findOne as jest.Mock).mockRejectedValue(
      new Error("Category DB Error")
    );

    const mockReq = mockRequest();
    const mockRes = mockResponse();
    await productCategoryController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      error: expect.any(Error),
      message: "Error while getting products",
    });
  });

  it("should return 400 if productModel.find().populate() throws an error", async () => {
    const mockCategory = {
      _id: "1",
      name: "Electronics",
      slug: "electronics",
    } as any;
    (categoryModel.findOne as jest.Mock).mockResolvedValue(mockCategory);

    const populateMock = jest
      .fn()
      .mockRejectedValue(new Error("Product DB Error"));
    (productModel.find as jest.Mock).mockReturnValue({
      populate: populateMock,
    });

    const mockReq = mockRequest();
    const mockRes = mockResponse();
    await productCategoryController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      error: expect.any(Error),
      message: "Error while getting products",
    });
  });
});
