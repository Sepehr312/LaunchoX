"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { AppError, type ActionResult } from "@/lib/errors";
import {
  addToCart,
  getCart,
  removeFromCart,
  updateCartItem,
} from "@/services/cart.service";
import {
  cartItemSchema,
  guestIdSchema,
  removeCartItemSchema,
} from "@/validations/cart";
import type { CartOwner, CartView } from "@/types/cart";

async function currentOwner(): Promise<CartOwner | null> {
  const user = await getCurrentUser();
  if (user) return { user: user.id };
  const parsed = guestIdSchema.safeParse(
    (await cookies()).get("cart_id")?.value,
  );
  return parsed.success ? { guestId: parsed.data } : null;
}

export async function getCurrentCart(): Promise<CartView> {
  const owner = await currentOwner();
  return owner
    ? getCart(owner)
    : {
        items: [],
        warnings: [],
        count: 0,
        subtotal: 0,
        shippingFee: 0,
        total: 0,
      };
}

async function mutateCart(
  form: FormData,
  operation: "add" | "update" | "remove",
): Promise<ActionResult> {
  const parsed = (
    operation === "remove" ? removeCartItemSchema : cartItemSchema
  ).safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      ok: false,
      error: "اطلاعات سبد معتبر نیست",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  try {
    let owner = await currentOwner();
    const createGuest = !owner && operation === "add";
    if (createGuest) owner = { guestId: randomUUID() };
    if (!owner) return { ok: false, error: "سبد خرید خالی است" };
    const service =
      operation === "add"
        ? addToCart
        : operation === "update"
          ? updateCartItem
          : removeFromCart;
    await service(owner, parsed.data);
    if (createGuest && owner.guestId)
      (await cookies()).set("cart_id", owner.guestId, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
        secure:
          getEnv().NODE_ENV === "production" &&
          getEnv().NEXT_PUBLIC_SITE_URL.startsWith("https:"),
      });
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (error: unknown) {
    if (error instanceof AppError) return { ok: false, error: error.message };
    console.error("Cart mutation failed", error);
    return { ok: false, error: "خطایی رخ داد، دوباره تلاش کنید" };
  }
}

export async function addCartAction(
  _state: ActionResult | undefined,
  form: FormData,
) {
  return mutateCart(form, "add");
}
export async function updateCartAction(
  _state: ActionResult | undefined,
  form: FormData,
) {
  return mutateCart(form, "update");
}
export async function removeCartAction(
  _state: ActionResult | undefined,
  form: FormData,
) {
  return mutateCart(form, "remove");
}
