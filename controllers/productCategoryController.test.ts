import productModel from "../models/productModel";
import categoryModel from "../models/categoryModel";
import { productCategoryController } from "./productController";

// mock the models
jest.mock("../models/productModel");
jest.mock("../models/categoryModel");

// mock data
const mockCategory = { _id: "1", name: "Electronics", slug: "electronics" };
const mockProducts = [
  { _id: "1", name: "Product 1", category: mockCategory },
  { _id: "2", name: "Product 2", category: mockCategory },
];

// =====================================================
// ProductCategoryController
// =====================================================

describe("productCategoryController", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = { params: { slug: "electronics" } };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return products and category when successful", async () => {
    (categoryModel.findOne as jest.Mock).mockResolvedValue(mockCategory);
    (productModel.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockProducts),
    });

    await productCategoryController(req, res);

    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "electronics" });
    expect(productModel.find).toHaveBeenCalledWith({ category: mockCategory });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      category: mockCategory,
      products: mockProducts,
    });
  });

  it("should return 400 if categoryModel.findOne throws an error", async () => {
    (categoryModel.findOne as jest.Mock).mockRejectedValue(
      new Error("Category DB Error")
    );

    await productCategoryController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: expect.any(Error),
      message: "Error while getting products",
    });
  });
  it("should return 400 if productModel.find().populate() throws an error", async () => {
    const mockCategory = {
      _id: "cat1",
      name: "Electronics",
      slug: "electronics",
    };
    (categoryModel.findOne as jest.Mock).mockResolvedValue(mockCategory);

    (productModel.find as jest.Mock).mockRejectedValue(
      new Error("Product DB Error")
    );

    await productCategoryController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: expect.any(Error),
      message: "Error while getting products",
    });
  });
});
