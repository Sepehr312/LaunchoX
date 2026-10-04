"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { AppError, type ActionResult } from "@/lib/errors";
import { addAddress } from "@/services/user.service";
import { startCheckout } from "@/services/payment/payment.service";
import { orderSchema } from "@/validations/order";
import { addressSchema } from "@/validations/address";
import type { AddressDTO } from "@/types/dto";

export async function checkoutAction(
  _state: ActionResult | undefined,
  form: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = orderSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      ok: false,
      error: "اطلاعات سفارش معتبر نیست",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  let destination: string;
  try {
    destination = (await startCheckout(user.id, parsed.data)).redirectUrl;
  } catch (error: unknown) {
    unstable_rethrow(error);
    if (error instanceof AppError) return { ok: false, error: error.message };
    console.error("Checkout failed", error);
    return { ok: false, error: "خطایی رخ داد، دوباره تلاش کنید" };
  }
  revalidatePath("/", "layout");
  redirect(destination);
}

export async function addCheckoutAddressAction(
  _state: ActionResult<AddressDTO[]> | undefined,
  form: FormData,
): Promise<ActionResult<AddressDTO[]>> {
  const user = await requireUser();
  const parsed = addressSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      ok: false,
      error: "اطلاعات آدرس معتبر نیست",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  try {
    const addresses = await addAddress(user.id, parsed.data);
    revalidatePath("/checkout");
    return { ok: true, data: addresses };
  } catch (error: unknown) {
    if (error instanceof AppError) return { ok: false, error: error.message };
    console.error("Checkout address creation failed", error);
    return { ok: false, error: "خطایی رخ داد، دوباره تلاش کنید" };
  }
}
