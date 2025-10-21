import express, { Express } from "express";
import request from "supertest";
import * as productController from "../controllers/productController";
import * as authMiddleware from "../middlewares/authMiddleware";
import router from "../routes/productRoutes";

jest.mock("../controllers/productController");
jest.mock("../middlewares/authMiddleware");
jest.mock("express-formidable", () =>
  jest.fn(() => (req: any, res: any, next: any) => next())
);
jest.mock("braintree", () => {
  return {
    BraintreeGateway: jest.fn().mockImplementation(() => ({})),
    Environment: { Sandbox: "Sandbox", Production: "Production" },
  };
});

const mockRequireSignIn = authMiddleware.requireSignIn as jest.Mock;
const mockIsAdmin = authMiddleware.isAdmin as jest.Mock;

describe("productRoutes", () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/api", router);

    jest.clearAllMocks();
    mockRequireSignIn.mockImplementation((req, res, next) => next());
    mockIsAdmin.mockImplementation((req, res, next) => next());
  });

  describe("POST /create-product", () => {
    it("should call requireSignIn, isAdmin, formidable, and createProductController", async () => {
      (
        productController.createProductController as jest.Mock
      ).mockImplementation((req, res) =>
        res.status(201).json({ created: true })
      );
      const res = await request(app)
        .post("/api/create-product")
        .send({ name: "Test Product" });
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ created: true });
      expect(mockRequireSignIn).toHaveBeenCalled();
      expect(mockIsAdmin).toHaveBeenCalled();
      expect(productController.createProductController).toHaveBeenCalled();
    });
  });

  describe("PUT /update-product/:pid", () => {
    it("should call requireSignIn, isAdmin, formidable, and updateProductController", async () => {
      (
        productController.updateProductController as jest.Mock
      ).mockImplementation((req, res) =>
        res.status(200).json({ updated: true })
      );
      const res = await request(app)
        .put("/api/update-product/123")
        .send({ name: "Updated Product" });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ updated: true });
      expect(mockRequireSignIn).toHaveBeenCalled();
      expect(mockIsAdmin).toHaveBeenCalled();
      expect(productController.updateProductController).toHaveBeenCalled();
    });
  });

  describe("GET /get-product", () => {
    it("should call getProductController", async () => {
      (productController.getProductController as jest.Mock).mockImplementation(
        (req, res) => res.status(200).json({ products: [] })
      );
      const res = await request(app).get("/api/get-product");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ products: [] });
      expect(productController.getProductController).toHaveBeenCalled();
    });
  });

  describe("GET /get-product/:slug", () => {
    it("should call getSingleProductController", async () => {
      (
        productController.getSingleProductController as jest.Mock
      ).mockImplementation((req, res) =>
        res.status(200).json({ product: { slug: req.params.slug } })
      );
      const res = await request(app).get("/api/get-product/test-slug");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ product: { slug: "test-slug" } });
      expect(productController.getSingleProductController).toHaveBeenCalled();
    });
  });

  describe("GET /product-photo/:pid", () => {
    it("should call productPhotoController", async () => {
      (
        productController.productPhotoController as jest.Mock
      ).mockImplementation((req, res) => res.status(200).send("photo"));
      const res = await request(app).get("/api/product-photo/123");
      expect(res.status).toBe(200);
      expect(productController.productPhotoController).toHaveBeenCalled();
    });
  });

  describe("DELETE /delete-product/:pid", () => {
    it("should call deleteProductController", async () => {
      (
        productController.deleteProductController as jest.Mock
      ).mockImplementation((req, res) =>
        res.status(200).json({ deleted: true })
      );
      const res = await request(app).delete("/api/delete-product/123");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ deleted: true });
      expect(productController.deleteProductController).toHaveBeenCalled();
    });
  });

  describe("POST /product-filters", () => {
    it("should call productFiltersController", async () => {
      (
        productController.productFiltersController as jest.Mock
      ).mockImplementation((req, res) =>
        res.status(200).json({ filtered: [] })
      );
      const res = await request(app)
        .post("/api/product-filters")
        .send({ category: "test" });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ filtered: [] });
      expect(productController.productFiltersController).toHaveBeenCalled();
    });
  });

  describe("GET /product-count", () => {
    it("should call productCountController", async () => {
      (
        productController.productCountController as jest.Mock
      ).mockImplementation((req, res) => res.status(200).json({ count: 5 }));
      const res = await request(app).get("/api/product-count");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ count: 5 });
      expect(productController.productCountController).toHaveBeenCalled();
    });
  });

  describe("GET /product-list/:page", () => {
    it("should call productListController", async () => {
      (productController.productListController as jest.Mock).mockImplementation(
        (req, res) =>
          res.status(200).json({ products: [], page: req.params.page })
      );
      const res = await request(app).get("/api/product-list/2");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ products: [], page: "2" });
      expect(productController.productListController).toHaveBeenCalled();
    });
  });

  describe("GET /search/:keyword", () => {
    it("should call searchProductController", async () => {
      (
        productController.searchProductController as jest.Mock
      ).mockImplementation((req, res) =>
        res.status(200).json({ results: [], keyword: req.params.keyword })
      );
      const res = await request(app).get("/api/search/test");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ results: [], keyword: "test" });
      expect(productController.searchProductController).toHaveBeenCalled();
    });
  });

  describe("GET /related-product/:pid/:cid", () => {
    it("should call relatedProductController", async () => {
      (
        productController.relatedProductController as jest.Mock
      ).mockImplementation((req, res) =>
        res
          .status(200)
          .json({ related: [], pid: req.params.pid, cid: req.params.cid })
      );
      const res = await request(app).get("/api/related-product/1/2");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ related: [], pid: "1", cid: "2" });
      expect(productController.relatedProductController).toHaveBeenCalled();
    });
  });

  describe("GET /product-category/:slug", () => {
    it("should call productCategoryController", async () => {
      (
        productController.productCategoryController as jest.Mock
      ).mockImplementation((req, res) =>
        res.status(200).json({ category: req.params.slug })
      );
      const res = await request(app).get("/api/product-category/test-category");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ category: "test-category" });
      expect(productController.productCategoryController).toHaveBeenCalled();
    });
  });

  describe("GET /braintree/token", () => {
    it("should call braintreeTokenController", async () => {
      (
        productController.braintreeTokenController as jest.Mock
      ).mockImplementation((req, res) =>
        res.status(200).json({ token: "abc" })
      );
      const res = await request(app).get("/api/braintree/token");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ token: "abc" });
      expect(productController.braintreeTokenController).toHaveBeenCalled();
    });
  });

  describe("POST /braintree/payment", () => {
    it("should call requireSignIn and brainTreePaymentController", async () => {
      (
        productController.brainTreePaymentController as jest.Mock
      ).mockImplementation((req, res) => res.status(200).json({ paid: true }));
      const res = await request(app)
        .post("/api/braintree/payment")
        .send({ amount: 100 });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ paid: true });
      expect(mockRequireSignIn).toHaveBeenCalled();
      expect(productController.brainTreePaymentController).toHaveBeenCalled();
    });
  });
});
