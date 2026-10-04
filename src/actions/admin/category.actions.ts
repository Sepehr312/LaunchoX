"use server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { AppError, type ActionResult } from "@/lib/errors";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/services/category.service";
import { categorySchema } from "@/validations/category";
import { objectIdSchema } from "@/validations/common";

export async function categoryAction(
  _state: ActionResult<{ id: string }> | undefined,
  form: FormData,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  try {
    const operation = z
      .enum(["create", "edit", "delete"])
      .parse(form.get("operation"));
    let id = operation === "create" ? "" : objectIdSchema.parse(form.get("id"));
    if (operation === "delete") await deleteCategory(id);
    else {
      const input = categorySchema.parse({
        ...Object.fromEntries(form),
        isActive: form.has("isActive"),
      });
      const category =
        operation === "create"
          ? await createCategory(input)
          : await updateCategory(id, input);
      id = category.id;
    }
    revalidatePath("/", "layout");
    return { ok: true, data: { id } };
  } catch (error: unknown) {
    unstable_rethrow(error);
    if (error instanceof z.ZodError)
      return {
        ok: false,
        error: error.issues[0]?.message ?? "ورودی معتبر نیست",
        fieldErrors: error.flatten().fieldErrors,
      };
    if (error instanceof AppError) return { ok: false, error: error.message };
    console.error("Category administration failed", error);
    return { ok: false, error: "ذخیرهٔ تغییرات انجام نشد؛ دوباره تلاش کنید" };
  }
}
