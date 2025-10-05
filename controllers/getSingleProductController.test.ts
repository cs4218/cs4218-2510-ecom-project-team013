import type { Request, Response } from "express";
import productModel from "../models/productModel";
import { getSingleProductController } from "./productController";

// mock the productModel
jest.mock("../models/productModel");

// mock braintree - payment
jest.mock("braintree", () => {
  return {
    BraintreeGateway: jest.fn().mockImplementation(() => ({})),
    Environment: { Sandbox: "Sandbox", Production: "Production" },
  };
});

// Mock Request and Response
const mockRequest = () => {
  const req: Partial<Request> = {
    params: { slug: "test-product" }
  };
  return req as Request;
};

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnThis();
  res.send = jest.fn().mockReturnThis();
  return res as Response;
};

// =====================================================
// GetSingleProductController
// =====================================================

describe("getSingleProductController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a single product successfully", async () => {
    const mockProduct = { name: "Test Product", slug: "test-product" } as any;

    (productModel.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis().mockResolvedValue(mockProduct),
    });

    const mockReq = mockRequest();
    const mockRes = mockResponse();
    await getSingleProductController(mockReq, mockRes);

    expect(productModel.findOne).toHaveBeenCalledWith({ slug: "test-product" });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      message: "Single product fetched",
      product: mockProduct,
    });
  });

  it("should handle product not found (null)", async () => {
    (productModel.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis().mockResolvedValue(null),
    });

    const mockReq = mockRequest();
    const mockRes = mockResponse();
    await getSingleProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Product not found",
    });
  });

  it("should handle errors", async () => {
    (productModel.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest
        .fn()
        .mockReturnThis()
        .mockRejectedValue(new Error("DB error")),
    });

    const mockReq = mockRequest();
    const mockRes = mockResponse();
    await getSingleProductController(mockReq, mockRes);

    expect(productModel.findOne).toHaveBeenCalledWith({ slug: "test-product" });
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while getting single product",
      error: expect.any(Error),
    });
  });
});
