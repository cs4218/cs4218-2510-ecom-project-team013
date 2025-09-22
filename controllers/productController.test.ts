import { getProductController } from "./productController";
import productModel from "../models/productModel";

// mock the productModel
jest.mock("../models/productModel");

describe("getProductController", () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  it("should return products successfully", async () => {
    const mockProducts = [
      { name: "Product 1" },
      { name: "Product 2" },
    ];

    // Mock the chain of mongoose calls
    (productModel.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis().mockResolvedValue(mockProducts),
    });


    await getProductController(mockReq, mockRes, mockNext);


    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      counTotal: mockProducts.length,
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


    await getProductController(mockReq, mockRes, mockNext);


    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Erorr in getting products",
      error: "DB error",
    });
  });
});