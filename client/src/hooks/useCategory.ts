import axios from "axios";
import { useEffect, useState } from "react";

type Category = { _id: string; name: string };

export default function useCategory() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data } = await axios.get("/api/v1/category/get-category");

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
