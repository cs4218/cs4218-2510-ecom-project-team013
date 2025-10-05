import type { Request, Response } from "express";
import productModel from "../models/productModel";
import { productPhotoController } from "./productController";

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
    params: { pid: "123" },
    
  };
  return req as Request;
};

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnThis();
  res.send = jest.fn().mockReturnThis();
  res.set = jest.fn().mockReturnThis();
  return res as Response;
};

// =====================================================
// ProductPhotoController
// =====================================================

describe("productPhotoController", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return photo successfully", async () => {
    const mockPhoto = {
      data: Buffer.from("fake-image-data"),
      contentType: "image/png",
    } as any;

    (productModel.findById as jest.Mock).mockReturnValue({
      select: jest
        .fn()
        .mockReturnThis()
        .mockResolvedValue({ photo: mockPhoto }),
    });

    const mockReq = mockRequest();
    const mockRes = mockResponse();
    await productPhotoController(mockReq, mockRes);

    expect(productModel.findById).toHaveBeenCalledWith("123");
    expect(mockRes.set).toHaveBeenCalledWith("Content-Type", "image/png");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith(mockPhoto.data);
  });

  it("should return 404 if product not found", async () => {
    (productModel.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis().mockResolvedValue(null),
    });

    const mockReq = mockRequest();
    const mockRes = mockResponse();
    await productPhotoController(mockReq, mockRes);

    expect(productModel.findById).toHaveBeenCalledWith("123");
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Product not found",
    });
  });

  it("should return 404 if product.photo is null", async () => {
    (productModel.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis().mockResolvedValue({ photo: null }),
    });

    const mockReq = mockRequest();
    const mockRes = mockResponse();
    await productPhotoController(mockReq, mockRes);

    expect(productModel.findById).toHaveBeenCalledWith("123");
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Photo not found",
    });
  });

  it("should return 404 if product.photo.data is missing", async () => {
    (productModel.findById as jest.Mock).mockReturnValue({
      select: jest
        .fn()
        .mockReturnThis()
        .mockResolvedValue({
          photo: { contentType: "image/png" },
        }),
    });

    const mockReq = mockRequest();
    const mockRes = mockResponse();
    await productPhotoController(mockReq, mockRes);

    expect(productModel.findById).toHaveBeenCalledWith("123");
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Photo not found",
    });
  });

  it("should return 200 and default content type if data present but contentType missing", async () => {
    (productModel.findById as jest.Mock).mockReturnValue({
      select: jest
        .fn()
        .mockReturnThis()
        .mockResolvedValue({
          photo: { data: Buffer.from("fake-data") } as any,
        }),
    });

    const mockReq = mockRequest();
    const mockRes = mockResponse();
    await productPhotoController(mockReq, mockRes);

    expect(productModel.findById).toHaveBeenCalledWith("123");
    expect(mockRes.set).toHaveBeenCalledWith(
      "Content-Type",
      "application/octet-stream"
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith(Buffer.from("fake-data"));
  });

  it("should handle errors", async () => {
    (productModel.findById as jest.Mock).mockReturnValue({
      select: jest
        .fn()
        .mockReturnThis()
        .mockRejectedValue(new Error("DB error")),
    });

    const mockReq = mockRequest();
    const mockRes = mockResponse();
    await productPhotoController(mockReq, mockRes);

    expect(productModel.findById).toHaveBeenCalledWith("123");
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while getting photo",
      error: expect.any(Error),
    });
  });
});
