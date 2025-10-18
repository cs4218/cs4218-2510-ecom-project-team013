import type { Request, Response } from "express";
import productModel from "../models/productModel";
import { getProductController } from "./productController";

// mock the productModel
jest.mock("../models/productModel");

// mock braintee - payment
jest.mock("braintree", () => {
  return {
    BraintreeGateway: jest.fn().mockImplementation(() => ({})),
    Environment: { Sandbox: "Sandbox", Production: "Production" },
  };
});

// Mock Request and Response
const mockRequest = () => {
  const req: Partial<Request> = {
    params: { pid: "123" },
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
// GetProductController
// =====================================================

describe("getProductController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle no products", async () => {
    const mockProducts: any[] = [];

    // Mock the chain of mongoose calls
    (productModel.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis().mockResolvedValue(mockProducts),
    });

    const mockReq = mockRequest();
    const mockRes = mockResponse();
    await getProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      countTotal: mockProducts.length,
      message: "All Products",
      products: mockProducts,
    });
  });

  it("should return products successfully", async () => {
    const mockProducts = [{ name: "Product 1" }, { name: "Product 2" }] as any;

    // Mock the chain of mongoose calls
    (productModel.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis().mockResolvedValue(mockProducts),
    });

    const mockReq = mockRequest();
    const mockRes = mockResponse();
    await getProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      countTotal: mockProducts.length,
      message: "All Products",
      products: mockProducts,
    });
  });

  it("should handle errors", async () => {
    // Mock the chain of mongoose calls
    (productModel.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis().mockRejectedValue(new Error("DB error")),
    });

    const mockReq = mockRequest();
    const mockRes = mockResponse();
    await getProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Error in getting products",
      error: "DB error",
    });
  });
});
