import { useEffect, useState } from "react";
import api from "../api";

type Category = { _id: string; name: string };

export default function useCategory() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data } = await api.category.getAllCategories();

        if (!mounted) return;

        const ok = data?.success === undefined ? true : Boolean(data.success);

        const next: Category[] =
          ok && Array.isArray(data?.category)
            ? (data.category as Category[])
            : [];

        setCategories(next);
      } catch (error) {
        if (!mounted) return;
        console.error("Failed to fetch categories", error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return categories;
}
