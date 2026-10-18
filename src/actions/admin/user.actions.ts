"use server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { AppError, type ActionResult } from "@/lib/errors";
import { setUserActive, setUserRole } from "@/services/admin-user.service";
import { userActiveSchema, userRoleSchema } from "@/validations/admin-user";

export async function userActiveAction(
  _state: ActionResult<{ id: string }> | undefined,
  form: FormData,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  try {
    const input = userActiveSchema.parse({
      id: form.get("id"),
      isActive: form.get("isActive"),
    });
    const data = await setUserActive(input);
    revalidatePath("/admin", "layout");
    return { ok: true, data };
  } catch (error: unknown) {
    unstable_rethrow(error);
    if (error instanceof z.ZodError)
      return {
        ok: false,
        error: error.issues[0]?.message ?? "ورودی معتبر نیست",
      };
    if (error instanceof AppError) return { ok: false, error: error.message };
    console.error("User administration failed", error);
    return { ok: false, error: "ذخیرهٔ تغییرات انجام نشد؛ دوباره تلاش کنید" };
  }
}

export async function userRoleAction(
  _state: ActionResult<{ id: string }> | undefined,
  form: FormData,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  try {
    const input = userRoleSchema.parse({
      id: form.get("id"),
      role: form.get("role"),
    });
    const data = await setUserRole(input);
    revalidatePath("/admin", "layout");
    return { ok: true, data };
  } catch (error: unknown) {
    unstable_rethrow(error);
    if (error instanceof z.ZodError)
      return {
        ok: false,
        error: error.issues[0]?.message ?? "ورودی معتبر نیست",
      };
    if (error instanceof AppError) return { ok: false, error: error.message };
    console.error("User role update failed", error);
    return { ok: false, error: "تغییر نقش انجام نشد؛ دوباره تلاش کنید" };
  }
}
