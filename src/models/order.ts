import "server-only";
import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  integerField,
  isAssetUrl,
  modelOptions,
  optionalText,
  requiredText,
  shippingAddressSchema,
  slugPattern,
  type StoredDocument,
  type Timestamps,
} from "@/lib/model-shared";
import {
  orderStatuses,
  paymentStatuses,
  type AddressFields,
  type OrderStatus,
  type PaymentStatus,
} from "@/types/domain";

export interface IOrderItem extends Timestamps {
  product: Types.ObjectId;
  title: string;
  slug: string;
  image: string;
  price: number;
  quantity: number;
}
export interface IPayment extends Timestamps {
  status: PaymentStatus;
  provider?: string;
  authority?: string;
  refId?: string;
  paidAt?: Date;
}
export interface IStatusHistory extends Timestamps {
  status: OrderStatus;
  changedAt: Date;
  changedBy?: Types.ObjectId;
}
export interface IOrder extends StoredDocument {
  orderNumber: string;
  user: Types.ObjectId;
  items: IOrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  shippingAddress: AddressFields & Timestamps;
  status: OrderStatus;
  payment: IPayment;
  note?: string;
  statusHistory: IStatusHistory[];
}
const itemSchema = new Schema<IOrderItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "محصول الزامی است"],
    },
    title: requiredText,
    slug: { ...requiredText, match: [slugPattern, "نامک معتبر نیست"] },
    image: {
      ...requiredText,
      validate: { validator: isAssetUrl, message: "نشانی تصویر معتبر نیست" },
    },
    price: { ...integerField, required: [true, "قیمت الزامی است"] },
    quantity: {
      ...integerField,
      required: [true, "تعداد الزامی است"],
      min: [1, "تعداد باید حداقل ۱ باشد"],
      max: [10, "تعداد باید حداکثر ۱۰ باشد"],
    },
  },
  { ...modelOptions, _id: false },
);
const paymentSchema = new Schema<IPayment>(
  {
    status: {
      type: String,
      enum: { values: paymentStatuses, message: "وضعیت پرداخت معتبر نیست" },
      default: "unpaid",
      required: [true, "وضعیت پرداخت الزامی است"],
    },
    provider: optionalText,
    authority: optionalText,
    refId: optionalText,
    paidAt: Date,
  },
  { ...modelOptions, _id: false },
);
const historySchema = new Schema<IStatusHistory>(
  {
    status: {
      type: String,
      enum: { values: orderStatuses, message: "وضعیت سفارش معتبر نیست" },
      required: [true, "وضعیت الزامی است"],
    },
    changedAt: {
      type: Date,
      default: Date.now,
      required: [true, "زمان تغییر وضعیت الزامی است"],
    },
    changedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { ...modelOptions, _id: false },
);
const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      ...requiredText,
      unique: true,
      match: [/^LX-\d{6,}$/, "شمارهٔ سفارش معتبر نیست"],
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "کاربر الزامی است"],
      index: true,
    },
    items: {
      type: [itemSchema],
      required: [true, "اقلام سفارش الزامی است"],
      validate: {
        validator: (items: IOrderItem[]) => items.length > 0,
        message: "سفارش نمی‌تواند خالی باشد",
      },
    },
    subtotal: { ...integerField, required: [true, "جمع اقلام الزامی است"] },
    shippingFee: {
      ...integerField,
      required: [true, "هزینهٔ ارسال الزامی است"],
    },
    total: { ...integerField, required: [true, "مبلغ نهایی الزامی است"] },
    shippingAddress: {
      type: shippingAddressSchema,
      required: [true, "آدرس ارسال الزامی است"],
    },
    status: {
      type: String,
      enum: { values: orderStatuses, message: "وضعیت سفارش معتبر نیست" },
      default: "pending",
      required: [true, "وضعیت سفارش الزامی است"],
    },
    payment: {
      type: paymentSchema,
      default: () => ({ status: "unpaid" }),
      required: [true, "اطلاعات پرداخت الزامی است"],
    },
    note: {
      ...optionalText,
      maxlength: [500, "یادداشت باید حداکثر ۵۰۰ کاراکتر باشد"],
    },
    statusHistory: {
      type: [historySchema],
      default: [],
      required: [true, "تاریخچهٔ وضعیت الزامی است"],
    },
  },
  modelOptions,
);
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ "payment.authority": 1 });

export const Order: Model<IOrder> =
  (models.Order as Model<IOrder> | undefined) ??
  model<IOrder>("Order", orderSchema);
