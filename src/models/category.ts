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
} from "@/lib/model-shared";

export interface ICategory extends StoredDocument {
  name: string;
  slug: string;
  parent?: Types.ObjectId;
  description?: string;
  image?: string;
  order: number;
  isActive: boolean;
}
const categorySchema = new Schema<ICategory>(
  {
    name: { ...requiredText, unique: true },
    slug: {
      ...requiredText,
      unique: true,
      match: [slugPattern, "نامک معتبر نیست"],
    },
    parent: { type: Schema.Types.ObjectId, ref: "Category" },
    description: optionalText,
    image: {
      ...optionalText,
      validate: { validator: isAssetUrl, message: "نشانی تصویر معتبر نیست" },
    },
    order: { ...integerField, default: 0 },
    isActive: {
      type: Boolean,
      default: true,
      required: [true, "وضعیت فعالیت الزامی است"],
    },
  },
  modelOptions,
);

categorySchema.index({ image: 1 });

export const Category: Model<ICategory> =
  (models.Category as Model<ICategory> | undefined) ??
  model<ICategory>("Category", categorySchema);
