import "server-only";
import { Schema, Types, type SchemaDefinition } from "mongoose";
import type { AddressFields } from "@/types/domain";

export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}
export interface StoredDocument extends Timestamps {
  _id: Types.ObjectId;
}
export interface IAddress extends AddressFields, StoredDocument {}

type Serialized<T> = T extends Date | Types.ObjectId
  ? string
  : T extends readonly (infer U)[]
    ? Serialized<U>[]
    : T extends object
      ? {
          [
            K in keyof T as K extends "__v" | "passwordHash"
              ? never
              : K extends "_id"
                ? "id"
                : K
          ]: Serialized<T[K]>;
        }
      : T;

function serializeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Types.ObjectId) return value.toHexString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (value !== null && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (key === "__v" || key === "passwordHash" || entry === undefined)
        continue;
      output[key === "_id" ? "id" : key] = serializeValue(entry);
    }
    return output;
  }
  return value;
}

// Use with lean records; model toJSON applies the same recursive redaction.
export function toDTO<T extends object>(record: T): Serialized<T> {
  return serializeValue(record) as Serialized<T>;
}

export const modelOptions = {
  timestamps: true,
  toJSON: {
    transform: (_document: unknown, record: Record<string, unknown>) =>
      toDTO(record),
  },
} as const;

export const requiredText = {
  type: String,
  trim: true,
  required: [true, "این فیلد الزامی است"] satisfies [boolean, string],
} as const;
export const integerField = {
  type: Number,
  min: [0, "عدد نمی‌تواند منفی باشد"] satisfies [number, string],
  validate: {
    validator: Number.isSafeInteger,
    message: "عدد باید صحیح و در محدودهٔ مجاز باشد",
  },
} as const;
export const mobilePattern = /^09\d{9}$/;
export const slugPattern = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;
export function isHttpUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
export function isAssetUrl(value: string): boolean {
  if (isHttpUrl(value)) return true;
  return (
    /^\/(?!\/)[A-Za-z0-9/_\-.]+$/.test(value) &&
    !value.split("/").includes("..")
  );
}
export function blankToUndefined(value: unknown): unknown {
  if (value === null) return undefined;
  return typeof value === "string" ? value.trim() || undefined : value;
}
export const optionalText = { type: String, set: blankToUndefined } as const;
export const addressDefinition = {
  title: requiredText,
  recipientName: requiredText,
  mobile: {
    ...requiredText,
    match: [mobilePattern, "شمارهٔ موبایل معتبر نیست"],
  },
  province: requiredText,
  city: requiredText,
  postalCode: {
    ...requiredText,
    match: [/^\d{10}$/, "کد پستی باید ۱۰ رقم باشد"],
  },
  addressLine: requiredText,
  isDefault: {
    type: Boolean,
    default: false,
    required: [true, "وضعیت پیش‌فرض الزامی است"],
  },
} satisfies SchemaDefinition<AddressFields>;
export const addressSchema = new Schema<IAddress>(
  addressDefinition,
  modelOptions,
);
export const shippingAddressSchema = new Schema<AddressFields & Timestamps>(
  addressDefinition,
  { ...modelOptions, _id: false },
);
