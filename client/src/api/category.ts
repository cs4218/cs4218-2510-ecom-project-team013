import axios from "axios";

export const categoryApi = {
  async getAllCategories() {
    return await axios.get("/api/v1/category/get-category");
  },
  async createCategory(name: string) {
    return await axios.post("/api/v1/category/create-category", { name });
  },
  async updateCategory(id: string, name: string) {
    return await axios.put(`/api/v1/category/update-category/${id}`, { name });
  },
  async deleteCategory(id: string) {
    return await axios.delete(`/api/v1/category/delete-category/${id}`);
  },
};
