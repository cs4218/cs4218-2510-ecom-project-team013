import type { Request, Response } from "express";
import productModel from "../models/productModel";
import { deleteProductController } from "./productController";

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
// DeleteProductController
// =====================================================

describe("deleteProductController", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete product successfully", async () => {
    (productModel.findByIdAndDelete as jest.Mock).mockResolvedValue({
      _id: "123",
    });

    const mockReq = mockRequest();
    const mockRes = mockResponse();
    await deleteProductController(mockReq, mockRes);

    expect(productModel.findByIdAndDelete).toHaveBeenCalledWith("123");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      message: "Product Deleted successfully",
    });
  });

  it("should return 404 if product not found", async () => {
    (productModel.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

    const mockReq = mockRequest();
    const mockRes = mockResponse();
    await deleteProductController(mockReq, mockRes);

    expect(productModel.findByIdAndDelete).toHaveBeenCalledWith("123");
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Product not found",
    });
  });

  it("should return 500 if an error occurs", async () => {
    (productModel.findByIdAndDelete as jest.Mock).mockRejectedValue(
      new Error("DB error")
    );

    const mockReq = mockRequest();
    const mockRes = mockResponse();
    await deleteProductController(mockReq, mockRes);

    expect(productModel.findByIdAndDelete).toHaveBeenCalledWith("123");
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while deleting product",
    });
  });
});
