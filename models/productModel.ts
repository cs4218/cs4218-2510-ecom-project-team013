import { model, Schema, type Document, type Types } from "mongoose";

export type Product = Document & {
  name: string;
  slug: string;
  description: string;
  price: number;
  category: Types.ObjectId;
  quantity: number;
  photo: {
    data: Buffer;
    contentType: string;
  };
  shipping: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const productSchema = new Schema<Product>(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    photo: {
      data: Buffer,
      contentType: String,
    },
    shipping: {
      type: Boolean,
    },
  },
  { timestamps: true }
);

export default model("Products", productSchema);
