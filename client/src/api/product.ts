import axios from "axios";
import type { ProductData } from "./types";

export const productApi = {
  async getAllProductsList(page: number) {
    return await axios.get(`/api/v1/product/product-list/${page}`);
  },
  // TODO: Improve typing
  async getProductsWithFilters(filters: any) {
    return await axios.post("/api/v1/product/product-filters", filters);
  },
  async getTotalProductCount() {
    return await axios.get("/api/v1/product/product-count");
  },
  // TODO: Remove undefined
  async getProductsByCategory(catId: string | undefined) {
    return await axios.get(`/api/v1/product/product-category/${catId}`);
  },
  // TODO: Double check this endpoint together with the next one
  async getAllProducts() {
    return await axios.get("/api/v1/product/get-product");
  },
  // TODO: Remove undefined
  async getSingleProduct(id: string | undefined) {
    return await axios.get(`/api/v1/product/get-product/${id}`);
  },
  async getRelatedProducts(pid: string, cid: string) {
    return await axios.get(`/api/v1/product/related-product/${pid}/${cid}`);
  },
  async createProduct(data: ProductData) {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("description", data.description);
    formData.append("price", data.price);
    formData.append("quantity", data.quantity);
    formData.append("category", data.category);
    formData.append("shipping", data.shipping);
    if (data.photo) {
      formData.append("photo", data.photo);
    }
    return await axios.post("/api/v1/product/create-product", formData);
  },
  async updateProduct(id: string, data: ProductData) {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("description", data.description);
    formData.append("price", data.price);
    formData.append("quantity", data.quantity);
    data.photo && formData.append("photo", data.photo);
    formData.append("category", data.category);
    formData.append("shipping", data.shipping.toString());
    return await axios.put(`/api/v1/product/update-product/${id}`, formData);
  },
  async deleteProduct(id: string) {
    return await axios.delete(`/api/v1/product/delete-product/${id}`);
  },
  async getBraintreeToken() {
    return await axios.get("/api/v1/product/braintree/token");
  },
  // TODO: Improve typing
  async makePayment(nonce: any, cart: any) {
    return await axios.post("/api/v1/product/braintree/payment", {
      nonce,
      cart,
    });
  },
};
