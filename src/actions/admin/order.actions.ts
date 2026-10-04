"use server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { AppError, type ActionResult } from "@/lib/errors";
import { updateOrderStatus } from "@/services/order.service";
import { updateOrderStatusSchema } from "@/validations/order";

export async function orderStatusAction(
  _state: ActionResult<{ id: string }> | undefined,
  form: FormData,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  try {
    const input = updateOrderStatusSchema.parse(Object.fromEntries(form));
    const order = await updateOrderStatus(input, admin.id);
    revalidatePath("/", "layout");
    return { ok: true, data: { id: order.id } };
  } catch (error: unknown) {
    unstable_rethrow(error);
    if (error instanceof z.ZodError)
      return {
        ok: false,
        error: error.issues[0]?.message ?? "ورودی معتبر نیست",
      };
    if (error instanceof AppError) return { ok: false, error: error.message };
    console.error("Order status update failed", error);
    return { ok: false, error: "تغییر وضعیت انجام نشد؛ دوباره تلاش کنید" };
  }
}
