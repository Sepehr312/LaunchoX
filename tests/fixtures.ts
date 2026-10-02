export const objectId = "507f1f77bcf86cd799439011";
export const guestId = "550e8400-e29b-41d4-a716-446655440000";
export const addressInput = {
  title: "خانه",
  recipientName: "علی رضایی",
  mobile: "09123456789",
  province: "تهران",
  city: "تهران",
  postalCode: "1234567890",
  addressLine: "خیابان آزادی، پلاک ۱۲",
  isDefault: true,
};
export const productInput = {
  title: "هدفون بی‌سیم",
  slug: "هدفون-بیسیم",
  description: "هدفون مناسب استفاده روزمره",
  price: 150000,
  stock: 5,
  category: objectId,
  images: ["https://example.com/headphones.jpg"],
};
// This syntactically valid hash is test data, never a login credential.
export const passwordHash = "$2b$12$" + "a".repeat(53);
export const userInput = {
  name: "علی رضایی",
  email: "ali@example.com",
  passwordHash,
};
export const orderInput = {
  orderNumber: "LX-100001",
  user: objectId,
  items: [
    {
      product: objectId,
      title: productInput.title,
      slug: productInput.slug,
      image: productInput.images[0],
      price: 150000,
      quantity: 1,
    },
  ],
  subtotal: 150000,
  shippingFee: 50000,
  total: 200000,
  shippingAddress: addressInput,
  statusHistory: [{ status: "pending" as const, changedBy: objectId }],
};
