import ICategory from "./ICategory";

interface IProduct {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  category: ICategory;
  quantity: number;
  shipping: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export default IProduct;