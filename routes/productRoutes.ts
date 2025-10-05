import { Router } from "express";
import formidable from "express-formidable";
import {
  brainTreePaymentController,
  braintreeTokenController,
  createProductController,
  deleteProductController,
  getProductController,
  getSingleProductController,
  productCategoryController,
  productCountController,
  productFiltersController,
  productListController,
  productPhotoController,
  relatedProductController,
  searchProductController,
  updateProductController,
} from "../controllers/productController";
import { isAdmin, requireSignIn } from "../middlewares/authMiddleware";

const router = Router()
  .post(
    "/create-product",
    requireSignIn,
    isAdmin,
    formidable(),
    createProductController
  )
  // Routes
  .put(
    "/update-product/:pid",
    requireSignIn,
    isAdmin,
    formidable(),
    updateProductController
  )
  // Get products
  .get("/get-product", getProductController)
  // Single product
  .get("/get-product/:slug", getSingleProductController)
  // Get photo
  .get("/product-photo/:pid", productPhotoController)
  // Delete rproduct
  .delete("/delete-product/:pid", deleteProductController)
  // Filter product
  .post("/product-filters", productFiltersController)
  // Product count
  .get("/product-count", productCountController)
  // Product per page
  .get("/product-list/:page", productListController)
  // Search product
  .get("/search/:keyword", searchProductController)
  // Similar product
  .get("/related-product/:pid/:cid", relatedProductController)
  // Category wise product
  .get("/product-category/:slug", productCategoryController)
  // Payments routes
  // Token
  .get("/braintree/token", braintreeTokenController)
  // Payments
  .post("/braintree/payment", requireSignIn, brainTreePaymentController);

export default router;
