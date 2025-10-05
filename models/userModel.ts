import { Schema, model, type Document } from "mongoose";

export type User = Document & {
  name: string;
  email: string;
  password: string;
  phone: string;
  // TODO: Figure out the proper typing for address
  address: Record<string, any>;
  answer: string;
  role: number;
  createdAt: Date;
  updatedAt: Date;
};

const userSchema = new Schema<User>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      type: {},
      required: true,
    },
    answer: {
      type: String,
      required: true,
    },
    role: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default model("users", userSchema);
