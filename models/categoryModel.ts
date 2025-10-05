import mongoose, { type Document, Schema } from "mongoose";

export type Category = Document & {
  name: string;
  slug: string;
};

const categorySchema = new Schema<Category>({
  name: {
    type: String,
    // required: true,
    // unique: true,
  },
  slug: {
    type: String,
    lowercase: true,
  },
});

export default mongoose.model("Category", categorySchema);
