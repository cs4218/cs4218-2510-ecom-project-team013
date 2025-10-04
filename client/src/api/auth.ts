import axios from "axios";
import type { ProfileData, RegisterData } from "./types";

export const authApi = {
  async checkAdminAuth() {
    return await axios.get("/api/v1/auth/admin-auth");
  },
  async checkUserAuth() {
    return await axios.get("/api/v1/auth/user-auth");
  },
  async login(email: string, password: string) {
    return await axios.post("/api/v1/auth/login", { email, password });
  },
  async register(data: RegisterData) {
    return await axios.post("/api/v1/auth/register", data);
  },
  async updateProfile(data: ProfileData) {
    return await axios.put("/api/v1/auth/profile", data);
  },
  async getAllOrders() {
    return await axios.get("/api/v1/auth/all-orders");
  },
  async getOrders() {
    return await axios.get("/api/v1/auth/orders");
  },
  async updateOrderStatus(id: string, status: string) {
    return await axios.put(`/api/v1/auth/order-status/${id}`, { status });
  },
};
