export const userRoles = ["customer", "admin"] as const;
export type UserRole = (typeof userRoles)[number];
export const orderStatuses = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof orderStatuses)[number];
export const paymentStatuses = [
  "unpaid",
  "paid",
  "failed",
  "refunded",
] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export interface AddressFields {
  title: string;
  recipientName: string;
  mobile: string;
  province: string;
  city: string;
  postalCode: string;
  addressLine: string;
  isDefault: boolean;
}

export interface ProductAttribute {
  key: string;
  value: string;
}
