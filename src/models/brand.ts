import "server-only";
import { Schema, model, models, type Model } from "mongoose";
import {
  integerField,
  isAssetUrl,
  isHttpUrl,
  modelOptions,
  optionalText,
  requiredText,
  slugPattern,
  type StoredDocument,
} from "@/lib/model-shared";

export interface IBrand extends StoredDocument {
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  country?: string;
  website?: string;
  isActive: boolean;
  isFeatured: boolean;
  order: number;
}

const brandSchema = new Schema<IBrand>(
  {
    name: { ...requiredText, unique: true },
    slug: {
      ...requiredText,
      unique: true,
      match: [slugPattern, "نامک معتبر نیست"],
    },
    logo: {
      ...optionalText,
      validate: { validator: isAssetUrl, message: "نشانی تصویر معتبر نیست" },
    },
    description: optionalText,
    country: optionalText,
    website: {
      ...optionalText,
      validate: { validator: isHttpUrl, message: "نشانی وب‌سایت معتبر نیست" },
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
    order: { ...integerField, default: 0 },
  },
  modelOptions,
);

export const Brand: Model<IBrand> =
  (models.Brand as Model<IBrand> | undefined) ??
  model<IBrand>("Brand", brandSchema);
