import "server-only";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { toDTO } from "@/lib/model-shared";
import { Cart } from "@/models/cart";
import { Product } from "@/models/product";
import { calculateCartTotals } from "@/services/order.service";
import {
  cartItemSchema,
  guestIdSchema,
  removeCartItemSchema,
} from "@/validations/cart";
import { objectIdSchema } from "@/validations/common";
import type { CartOwner, CartView } from "@/types/cart";
import type { ProductDTO } from "@/types/dto";

const ownerSchema = z.union([
  z.object({ user: objectIdSchema }).strict(),
  z.object({ guestId: guestIdSchema }).strict(),
]);

export async function getCart(owner: CartOwner): Promise<CartView> {
  const filter = ownerSchema.parse(owner);
  await connectDB();
  const cart = await Cart.findOne(filter).lean();
  const products = await Product.find({
    _id: { $in: cart?.items.map((item) => item.product) ?? [] },
    isActive: true,
  }).lean();
  const map = new Map(
    products.map((product) => [
      String(product._id),
      toDTO(product) as ProductDTO,
    ]),
  );
  const warnings: string[] = [];
  const items = (cart?.items ?? []).flatMap((item) => {
    const product = map.get(String(item.product));
    if (!product || product.stock === 0) {
      warnings.push("یک محصول ناموجود یا حذف‌شده از سبد کنار گذاشته شد");
      return [];
    }
    const quantity = Math.min(item.quantity, product.stock, 10);
    if (quantity !== item.quantity)
      warnings.push(`تعداد «${product.title}» به موجودی فعلی محدود شد`);
    return [{ product, quantity }];
  });
  // Reads reflect current availability without overwriting concurrent cart mutations.
  const totals = calculateCartTotals(
    items.map((item) => ({
      price: item.product.price,
      quantity: item.quantity,
    })),
  );
  return {
    items: items.map((item, index) => ({
      ...item,
      lineTotal: totals.lineTotals[index],
    })),
    warnings,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: totals.subtotal,
    shippingFee: totals.shippingFee,
    total: totals.total,
  };
}

async function changeItem(owner: CartOwner, input: unknown, add: boolean) {
  const filter = ownerSchema.parse(owner);
  const parsed = cartItemSchema.parse(input);
  await connectDB();
  const product = await Product.findOne({
    _id: parsed.product,
    isActive: true,
  }).lean();
  if (!product) throw new AppError("محصول پیدا نشد", "NOT_FOUND");
  if (!product.stock)
    throw new AppError("این محصول موجود نیست", "OUT_OF_STOCK");
  const maximum = Math.min(product.stock, 10);
  // A pipeline keeps simultaneous additions atomic and avoids duplicate product rows.
  await Cart.updateOne(
    filter,
    [
      {
        $set: {
          ...("user" in filter
            ? { user: { $toObjectId: filter.user } }
            : { guestId: filter.guestId }),
          items: {
            $let: {
              vars: { rows: { $ifNull: ["$items", []] } },
              in: {
                $cond: [
                  { $in: [{ $toObjectId: parsed.product }, "$$rows.product"] },
                  {
                    $map: {
                      input: "$$rows",
                      as: "item",
                      in: {
                        $cond: [
                          {
                            $eq: [
                              "$$item.product",
                              { $toObjectId: parsed.product },
                            ],
                          },
                          {
                            $mergeObjects: [
                              "$$item",
                              {
                                quantity: {
                                  $min: [
                                    maximum,
                                    add
                                      ? {
                                          $add: [
                                            "$$item.quantity",
                                            parsed.quantity,
                                          ],
                                        }
                                      : parsed.quantity,
                                  ],
                                },
                                updatedAt: "$$NOW",
                              },
                            ],
                          },
                          "$$item",
                        ],
                      },
                    },
                  },
                  {
                    $concatArrays: [
                      "$$rows",
                      [
                        {
                          product: { $toObjectId: parsed.product },
                          quantity: Math.min(maximum, parsed.quantity),
                          createdAt: "$$NOW",
                          updatedAt: "$$NOW",
                        },
                      ],
                    ],
                  },
                ],
              },
            },
          },
          createdAt: { $ifNull: ["$createdAt", "$$NOW"] },
          updatedAt: "$$NOW",
        },
      },
    ],
    { upsert: true, updatePipeline: true },
  );
  return getCart(owner);
}

export async function addToCart(owner: CartOwner, input: unknown) {
  return changeItem(owner, input, true);
}
export async function updateCartItem(owner: CartOwner, input: unknown) {
  return changeItem(owner, input, false);
}
export async function removeFromCart(owner: CartOwner, input: unknown) {
  const filter = ownerSchema.parse(owner);
  const parsed = removeCartItemSchema.parse(input);
  await connectDB();
  await Cart.updateOne(filter, {
    $pull: { items: { product: parsed.product } },
  });
  return getCart(owner);
}
export async function clearCart(owner: CartOwner) {
  await connectDB();
  await Cart.deleteOne(ownerSchema.parse(owner));
}
export async function mergeGuestCart(userId: string, guestId: string) {
  const user = objectIdSchema.parse(userId);
  const guest = guestIdSchema.parse(guestId);
  await connectDB();
  const cart = await getCart({ guestId: guest });
  for (const item of cart.items)
    await addToCart(
      { user },
      { product: item.product.id, quantity: item.quantity },
    );
  await Cart.deleteOne({ guestId: guest });
}
