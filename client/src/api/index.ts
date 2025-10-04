import { authApi } from "./auth";
import { categoryApi } from "./category";
import { productApi } from "./product";
import { searchApi } from "./search";

const api = {
  auth: authApi,
  category: categoryApi,
  product: productApi,
  search: searchApi,
};

export * from "./types";

export default api;
