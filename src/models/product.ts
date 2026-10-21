import "server-only";
import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  integerField,
  isAssetUrl,
  modelOptions,
  optionalText,
  requiredText,
  slugPattern,
  type StoredDocument,
  type Timestamps,
} from "@/lib/model-shared";
import type { ProductAttribute } from "@/types/domain";

export interface IProduct extends StoredDocument {
  title: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  sku?: string;
  images: string[];
  category: Types.ObjectId;
  brand?: Types.ObjectId;
  attributes: (ProductAttribute & Timestamps)[];
  isActive: boolean;
  isFeatured: boolean;
  soldCount: number;
}
const attributeSchema = new Schema<ProductAttribute & Timestamps>(
  { key: requiredText, value: requiredText },
  { ...modelOptions, _id: false },
);
const productSchema = new Schema<IProduct>(
  {
    title: {
      ...requiredText,
      minlength: [3, "عنوان باید حداقل ۳ کاراکتر باشد"],
      maxlength: [150, "عنوان باید حداکثر ۱۵۰ کاراکتر باشد"],
    },
    slug: {
      ...requiredText,
      unique: true,
      match: [slugPattern, "نامک معتبر نیست"],
    },
    description: requiredText,
    price: { ...integerField, required: [true, "قیمت الزامی است"] },
    compareAtPrice: {
      ...integerField,
      validate: [
        integerField.validate,
        {
          validator: function (this: IProduct, value: number) {
            return value > this.price;
          },
          message: "قیمت قبلی باید بیشتر از قیمت فروش باشد",
        },
      ],
    },
    stock: { ...integerField, required: [true, "موجودی الزامی است"] },
    sku: { ...optionalText, unique: true, sparse: true },
    images: {
      type: [String],
      required: [true, "تصویر الزامی است"],
      validate: {
        validator: (value: string[]) =>
          value.length >= 1 && value.length <= 8 && value.every(isAssetUrl),
        message: "بین ۱ تا ۸ نشانی تصویر معتبر وارد کنید",
      },
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "دسته‌بندی الزامی است"],
      index: true,
    },
    brand: { type: Schema.Types.ObjectId, ref: "Brand" },
    attributes: {
      type: [attributeSchema],
      default: [],
      required: [true, "فهرست مشخصات الزامی است"],
    },
    isActive: {
      type: Boolean,
      default: true,
      required: [true, "وضعیت فعالیت الزامی است"],
    },
    isFeatured: {
      type: Boolean,
      default: false,
      required: [true, "وضعیت ویژه الزامی است"],
    },
    soldCount: { ...integerField, default: 0 },
  },
  modelOptions,
);
productSchema.index({ title: "text", description: "text" });
productSchema.index({ category: 1, isActive: 1, createdAt: -1 });
productSchema.index({ isFeatured: 1, isActive: 1 });

productSchema.index({ images: 1 });

export const Product: Model<IProduct> =
  (models.Product as Model<IProduct> | undefined) ??
  model<IProduct>("Product", productSchema);
