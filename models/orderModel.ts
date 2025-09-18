import { model, Schema, type Document, type Types } from "mongoose";

export enum StatusEnum {
  NotProcess = "Not Process",
  Processing = "Processing",
  Shipped = "Shipped",
  Deliverd = "deliverd",
  Cancel = "cancel",
}

export type Order = Document & {
  products: Types.ObjectId[];
  // TODO: Figure out the proper typing for payment
  payment: Record<string, any>;
  buyer: Types.ObjectId;
  status: StatusEnum;
  createdAt: Date;
  updatedAt: Date;
};

const orderSchema = new Schema<Order>(
  {
    products: [
      {
        type: Schema.Types.ObjectId,
        ref: "Products",
      },
    ],
    payment: {},
    buyer: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    status: {
      type: String,
      default: StatusEnum.NotProcess,
      enum: StatusEnum,
    },
  },
  { timestamps: true }
);

export default model("Order", orderSchema);
