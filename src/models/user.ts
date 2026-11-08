import "server-only";
import { Schema, model, models, type Model } from "mongoose";
import {
  addressSchema,
  mobilePattern,
  modelOptions,
  optionalText,
  type IAddress,
  type StoredDocument,
} from "@/lib/model-shared";
import { userRoles, type UserRole } from "@/types/domain";

export interface IUser extends StoredDocument {
  name?: string;
  email?: string;
  mobile?: string;
  mobileVerifiedAt?: Date;
  passwordHash?: string;
  sessionVersion: number;
  role: UserRole;
  addresses: IAddress[];
  isActive: boolean;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      ...optionalText,
      minlength: [2, "نام باید حداقل ۲ کاراکتر باشد"],
      maxlength: [60, "نام باید حداکثر ۶۰ کاراکتر باشد"],
    },
    email: {
      ...optionalText,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "ایمیل معتبر نیست"],
    },
    mobile: {
      ...optionalText,
      unique: true,
      sparse: true,
      match: [mobilePattern, "شمارهٔ موبایل معتبر نیست"],
    },
    passwordHash: {
      type: String,
      select: false,
      match: [/^\$2[aby]\$12\$[./A-Za-z0-9]{53}$/, "هش رمز عبور معتبر نیست"],
    },
    mobileVerifiedAt: { type: Date },
    sessionVersion: {
      type: Number,
      default: 0,
      min: 0,
      validate: Number.isSafeInteger,
    },
    role: {
      type: String,
      enum: { values: userRoles, message: "نقش معتبر نیست" },
      default: "customer",
      required: [true, "نقش الزامی است"],
    },
    addresses: {
      type: [addressSchema],
      default: [],
      required: [true, "فهرست آدرس‌ها الزامی است"],
      validate: {
        validator: (value: IAddress[]) => value.length <= 5,
        message: "حداکثر ۵ آدرس مجاز است",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      required: [true, "وضعیت فعالیت الزامی است"],
    },
  },
  modelOptions,
);

userSchema.index(
  { email: 1 },
  {
    unique: true,
    name: "email_optional_unique",
    partialFilterExpression: { email: { $type: "string" } },
  },
);

export const User: Model<IUser> =
  (models.User as Model<IUser> | undefined) ?? model<IUser>("User", userSchema);
