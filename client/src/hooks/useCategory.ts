import axios from "axios";
import type { Document } from "mongoose";
import { useEffect, useState } from "react";

// Copied from models/categoryModel.ts
export type Category = Document & {
  name: string;
  slug: string;
};

export default function useCategory() {
  const [categories, setCategories] = useState<Category[]>([]);

  // Get all categories
  const getCategories = async () => {
    try {
      const { data } = await axios.get("/api/v1/category/get-category");
      setCategories(data?.category);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getCategories();
  }, []);

  return categories;
}
