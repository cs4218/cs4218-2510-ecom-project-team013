import {
  deleteProductController,
} from "./productController";
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
// DeleteProductController
// =====================================================

describe("deleteProductController", () => {
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

  it("should delete product successfully", async () => {
    (productModel.findByIdAndDelete as jest.Mock).mockResolvedValue({
      _id: "123",
    });

    await deleteProductController(mockReq, mockRes, mockNext);

    expect(productModel.findByIdAndDelete).toHaveBeenCalledWith("123");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      message: "Product Deleted successfully",
    });
  });

  it("should return 404 if product not found", async () => {
    (productModel.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

    await deleteProductController(mockReq, mockRes, mockNext);

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

    await deleteProductController(mockReq, mockRes, mockNext);

    expect(productModel.findByIdAndDelete).toHaveBeenCalledWith("123");
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while deleting product",
    });
  });
});