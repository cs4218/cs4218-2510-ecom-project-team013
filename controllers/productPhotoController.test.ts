import { productPhotoController } from "./productController";
import productModel from "../models/productModel";

// mock the productModel
jest.mock("../models/productModel");

// mock braintee - payment
jest.mock("braintree", () => {
  return {
    BraintreeGateway: jest.fn().mockImplementation(() => ({})),
    Environment: { Sandbox: "Sandbox", Production: "Production" },
  };
});

// =====================================================
// ProductPhotoController
// =====================================================

describe("productPhotoController", () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    mockReq = { params: { pid: "123" } };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  it("should return photo successfully", async () => {
    const mockPhoto = {
      data: Buffer.from("fake-image-data"),
      contentType: "image/png",
    };

    (productModel.findById as jest.Mock).mockReturnValue({
      select: jest
        .fn()
        .mockReturnThis()
        .mockResolvedValue({ photo: mockPhoto }),
    });

    await productPhotoController(mockReq, mockRes, mockNext);

    expect(productModel.findById).toHaveBeenCalledWith("123");
    expect(mockRes.set).toHaveBeenCalledWith("Content-Type", "image/png");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith(mockPhoto.data);
  });

  it("should return 404 if product not found", async () => {
    (productModel.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis().mockResolvedValue(null),
    });

    await productPhotoController(mockReq, mockRes, mockNext);

    expect(productModel.findById).toHaveBeenCalledWith("123");
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Photo not found for this product",
    });
  });

  it("should return 404 if product.photo is null", async () => {
    (productModel.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis().mockResolvedValue({ photo: null }),
    });

    await productPhotoController(mockReq, mockRes, mockNext);

    expect(productModel.findById).toHaveBeenCalledWith("123");
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Photo not found for this product",
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

    await productPhotoController(mockReq, mockRes, mockNext);

    expect(productModel.findById).toHaveBeenCalledWith("123");
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Photo not found for this product",
    });
  });

  it("should return 404 if product.photo.contentType is missing", async () => {
    (productModel.findById as jest.Mock).mockReturnValue({
      select: jest
        .fn()
        .mockReturnThis()
        .mockResolvedValue({
          photo: { data: Buffer.from("fake-data") },
        }),
    });

    await productPhotoController(mockReq, mockRes, mockNext);

    expect(productModel.findById).toHaveBeenCalledWith("123");
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Photo not found for this product",
    });
  });

  it("should handle errors", async () => {
    (productModel.findById as jest.Mock).mockReturnValue({
      select: jest
        .fn()
        .mockReturnThis()
        .mockRejectedValue(new Error("DB error")),
    });

    await productPhotoController(mockReq, mockRes, mockNext);

    expect(productModel.findById).toHaveBeenCalledWith("123");
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Erorr while getting photo",
      error: new Error("DB error"),
    });
  });
});
