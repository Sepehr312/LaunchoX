"use server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { AppError, type ActionResult } from "@/lib/errors";
import {
  updateProfile,
  changePassword,
  addAddress,
  manageAddress,
} from "@/services/user.service";
import { cancelOrder } from "@/services/order.service";
import { objectIdSchema } from "@/validations/common";
const operationSchema = z.enum([
  "profile",
  "password",
  "add",
  "edit",
  "delete",
  "default",
  "cancel",
]);
export async function accountAction(
  _state: ActionResult | undefined,
  form: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const operation = operationSchema.parse(form.get("operation"));
    const data = Object.fromEntries(form);
    if (operation === "profile") await updateProfile(user.id, data);
    else if (operation === "password") await changePassword(user.id, data);
    else if (operation === "add") await addAddress(user.id, data);
    else {
      const id = objectIdSchema.parse(form.get("id"));
      if (operation === "cancel") await cancelOrder(user.id, id);
      else await manageAddress(user.id, operation, id, data);
    }
    revalidatePath("/account", "layout");
    revalidatePath("/checkout");
    revalidatePath("/products", "layout");
    return { ok: true, data: undefined };
  } catch (error: unknown) {
    unstable_rethrow(error);
    if (error instanceof z.ZodError)
      return {
        ok: false,
        error: error.issues[0]?.message ?? "ورودی معتبر نیست",
        fieldErrors: error.flatten().fieldErrors,
      };
    if (error instanceof AppError) return { ok: false, error: error.message };
    console.error("Account update failed", error);
    return { ok: false, error: "خطایی رخ داد؛ دوباره تلاش کنید" };
  }
}
