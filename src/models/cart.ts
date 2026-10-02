import "server-only";
import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  integerField,
  modelOptions,
  type StoredDocument,
  type Timestamps,
} from "@/lib/model-shared";

export interface ICartItem extends Timestamps {
  product: Types.ObjectId;
  quantity: number;
}
export interface ICart extends StoredDocument {
  user?: Types.ObjectId;
  guestId?: string;
  items: ICartItem[];
}
const itemSchema = new Schema<ICartItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "محصول الزامی است"],
    },
    quantity: {
      ...integerField,
      required: [true, "تعداد الزامی است"],
      min: [1, "تعداد باید حداقل ۱ باشد"],
      max: [10, "تعداد باید حداکثر ۱۰ باشد"],
    },
  },
  { ...modelOptions, _id: false },
);
const cartSchema = new Schema<ICart>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      sparse: true,
    },
    guestId: {
      type: String,
      unique: true,
      sparse: true,
      match: [
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        "شناسهٔ مهمان معتبر نیست",
      ],
    },
    items: {
      type: [itemSchema],
      default: [],
      required: [true, "اقلام سبد الزامی است"],
    },
  },
  modelOptions,
);
cartSchema.pre("validate", function () {
  if (
    (this.user === undefined) === (this.guestId === undefined) ||
    this.user === null ||
    this.guestId === null
  ) {
    this.invalidate("user", "سبد باید دقیقاً یک مالک داشته باشد");
  }
});
cartSchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 30 * 24 * 60 * 60,
    partialFilterExpression: { guestId: { $exists: true } },
  },
);

export const Cart: Model<ICart> =
  (models.Cart as Model<ICart> | undefined) ?? model<ICart>("Cart", cartSchema);
