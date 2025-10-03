import {
  getProductController,
  getSingleProductController,
  productPhotoController,
  deleteProductController,
  updateProductController,
} from "./productController";
import productModel from "../models/productModel";
import fs from "fs";

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
// GetProductController
// =====================================================

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

// =====================================================
// GetSingleProductController
// =====================================================

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
      error: expect.any(Error),
    });
  });
});

// =====================================================
// UpdateProductController
// =====================================================

describe("updateProductController", () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    mockReq = {
      params: { pid: "123" },
      fields: {
        name: "Test Product",
        description: "Desc",
        price: "100",
        category: "cat123",
        quantity: "5",
        shipping: "true",
      },
      files: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  it("should update product successfully with fields (no photo)", async () => {
    const mockProduct = {
      save: jest.fn(),
    };

    (productModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(
      mockProduct
    );

    await updateProductController(mockReq, mockRes, mockNext);

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

    await updateProductController(mockReq, mockRes, mockNext);

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

    mockReq.fields = {
      name: "Test",
      description: "Desc",
      price: "100",
      category: "cat123",
      quantity: "5",
      shipping: "true",
    };

    mockReq.files = {
      photo: { path: "/tmp/photo.jpg", type: "image/jpeg", size: 500 },
    };

    (productModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(
      mockProduct
    );
    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from("data"));

    await updateProductController(mockReq, mockRes, mockNext);

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

    await updateProductController(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error in Update product",
      })
    );
  });

  it("should return validation error if name is missing", async () => {
    mockReq.fields.name = "";

    await updateProductController(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Name is Required",
      })
    );
  });

  it("should return validation error if description is missing", async () => {
    mockReq.fields.description = "";

    await updateProductController(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Description is Required",
      })
    );
  });

  it("should return validation error if price is missing", async () => {
    mockReq.fields.price = "";

    await updateProductController(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Price is Required",
      })
    );
  });

  it("should return validation error if category is missing", async () => {
    mockReq.fields.category = "";

    await updateProductController(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Category is Required",
      })
    );
  });

  it("should return validation error if quantity is missing", async () => {
    mockReq.fields.quantity = "";

    await updateProductController(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Quantity is Required",
      })
    );
  });

  it("should return validation error if shipping is undefined", async () => {
    mockReq.fields.shipping = undefined;

    await updateProductController(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Shipping is Required",
      })
    );
  });

  it("should return validation error if shipping is null", async () => {
    mockReq.fields.shipping = null;

    await updateProductController(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Shipping is Required",
      })
    );
  });

  it("should return validation error if photo size exceeds 1MB", async () => {
    mockReq.files.photo = {
      path: "/tmp/photo.jpg",
      type: "image/jpeg",
      size: 2000000,
    };

    await updateProductController(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Photo should be less than 1MB",
      })
    );
  });
});
