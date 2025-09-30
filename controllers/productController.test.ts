import {
  getProductController,
  getSingleProductController,
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

describe("getProductController", () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

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

    await getProductController(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      counTotal: mockProducts.length,
      message: "All Products",
      products: mockProducts,
    });
  });

  it("should return products successfully", async () => {
    const mockProducts = [{ name: "Product 1" }, { name: "Product 2" }];

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

describe("getSingleProductController", () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    mockReq = { params: { slug: "test-product" } };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  it("should return a single product successfully", async () => {
    const mockProduct = { name: "Test Product", slug: "test-product" };

    (productModel.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis().mockResolvedValue(mockProduct),
    });

    await getSingleProductController(mockReq, mockRes, mockNext);

    expect(productModel.findOne).toHaveBeenCalledWith({ slug: "test-product" });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      message: "Single Product Fetched",
      product: mockProduct,
    });
  });

  it("should handle product not found (null)", async () => {
    (productModel.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis().mockResolvedValue(null),
    });

    await getSingleProductController(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Product not found",
      product: null,
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

    await getSingleProductController(mockReq, mockRes, mockNext);

    expect(productModel.findOne).toHaveBeenCalledWith({ slug: "test-product" });
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Eror while getitng single product",
      error: new Error("DB error"),
    });
  });
});
