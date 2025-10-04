export type RegisterData = {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  DOB: string;
  answer: string;
};

export type ProfileData = Pick<
  RegisterData,
  "name" | "email" | "password" | "phone" | "address"
>;

// TODO: Change from all string to logically appropriate types
export type ProductData = {
  name: string;
  description: string;
  price: string;
  quantity: string;
  category: string;
  shipping: string;
  photo?: File;
};
