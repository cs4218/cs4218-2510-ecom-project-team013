import type { Request, Response } from "express";
import fs from "fs";
import productModel from "../models/productModel";
import { updateProductController } from "./productController";

// mock the productModel
jest.mock("../models/productModel");

// mock fs
jest.mock("fs");

// mock braintee - payment
jest.mock("braintree", () => {
  return {
    BraintreeGateway: jest.fn().mockImplementation(() => ({})),
    Environment: { Sandbox: "Sandbox", Production: "Production" },
  };
});

// =====================================================
// UpdateProductController
// =====================================================

const mockRequest = () => {
  const req: Partial<Request> = {
    params: { pid: "123" },
    fields: {
      name: "Test Product",
      description: "Desc",
      price: "100",
      category: "cat123",
      quantity: "5",
      shipping: "true",
    } as any,
    files: {},
  };
  return req as Request;
};

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnThis();
  res.send = jest.fn().mockReturnThis();
  return res as Response;
};

describe("updateProductController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update product successfully with fields (no photo)", async () => {
    const mockProduct = {
      save: jest.fn(),
    };

    (productModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(
      mockProduct
    );

    const mockReq = mockRequest();
    const mockRes = mockResponse();
    await updateProductController(mockReq, mockRes);

    expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "123",
      expect.objectContaining({
        name: "Test Product",
        description: "Desc",
        price: "100",
        category: "cat123",
        quantity: "5",
        shipping: "true",
        slug: "Test-Product",
      }),
      { new: true }
    );

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      message: "Product Updated Successfully",
      product: mockProduct,
    });
  });

  it("should return 404 if product not found", async () => {
    (productModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

    const mockReq = mockRequest();
    const mockRes = mockResponse();
    await updateProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Product not found",
    });
  });

  it("should update product photo only", async () => {
    const mockProduct = {
      save: jest.fn(),
      photo: {} as any,
    };

    const mockReq = mockRequest();
    const mockRes = mockResponse();
    mockReq.fields = {
      name: "Test",
      description: "Desc",
      price: "100",
      category: "cat123",
      quantity: "5",
      shipping: "true",
    } as any;

    mockReq.files = {
      photo: { path: "/tmp/photo.jpg", type: "image/jpeg", size: 500 },
    } as any;

    (productModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(
      mockProduct
    );
    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from("data"));

    await updateProductController(mockReq, mockRes);

    expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/photo.jpg");
    expect(mockProduct.photo).toEqual({
      data: Buffer.from("data"),
      contentType: "image/jpeg",
    });
    expect(mockProduct.save).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  it("should handle db errors", async () => {
    (productModel.findByIdAndUpdate as jest.Mock).mockRejectedValue(
      new Error("DB Error")
    );

    const mockReq = mockRequest();
    const mockRes = mockResponse();
    await updateProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error in Update product",
      })
    );
  });

  it("should return validation error if name is missing", async () => {
    const mockReq = mockRequest();
    (mockReq as any).fields.name = "";
    const mockRes = mockResponse();
    await updateProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Name is Required",
      })
    );
  });

  it("should return validation error if description is missing", async () => {
    const mockReq = mockRequest();
    (mockReq as any).fields.description = "";

    const mockRes = mockResponse();
    await updateProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Description is Required",
      })
    );
  });

  it("should return validation error if price is missing", async () => {
    const mockReq = mockRequest();
    (mockReq as any).fields.price = "";

    const mockRes = mockResponse();
    await updateProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Price is Required",
      })
    );
  });

  it("should return validation error if category is missing", async () => {
    const mockReq = mockRequest();
    (mockReq as any).fields.category = "";

    const mockRes = mockResponse();
    await updateProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Category is Required",
      })
    );
  });

  it("should return validation error if quantity is missing", async () => {
    const mockReq = mockRequest();
    (mockReq as any).fields.quantity = "";

    const mockRes = mockResponse();
    await updateProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Quantity is Required",
      })
    );
  });

  it("should return validation error if shipping is undefined", async () => {
    const mockReq = mockRequest();
    (mockReq as any).fields.shipping = undefined;

    const mockRes = mockResponse();
    await updateProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Shipping is Required",
      })
    );
  });

  it("should return validation error if shipping is null", async () => {
    const mockReq = mockRequest();
    (mockReq as any).fields.shipping = null;

    const mockRes = mockResponse();
    await updateProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Shipping is Required",
      })
    );
  });

  it("should return validation error if photo size exceeds 1MB", async () => {
    const mockReq = mockRequest();
    (mockReq as any).files.photo = {
      path: "/tmp/photo.jpg",
      type: "image/jpeg",
      size: 2000000,
    };

    const mockRes = mockResponse();
    await updateProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Photo should be less than 1MB",
      })
    );
  });
});
