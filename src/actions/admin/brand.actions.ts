"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { AppError, type ActionResult } from "@/lib/errors";
import {
  createBrand,
  updateBrand,
  deleteBrand,
} from "@/services/brand.service";
import {
  brandIdSchema,
  createBrandSchema,
  updateBrandSchema,
} from "@/validations/brand";

export async function brandAction(
  _state: ActionResult<{ id: string }> | undefined,
  form: FormData,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  try {
    const operation = z
      .enum(["create", "edit", "delete"])
      .parse(form.get("operation"));
    let id = operation === "create" ? "" : brandIdSchema.parse(form.get("id"));
    if (operation === "delete") await deleteBrand(id);
    else {
      const schema =
        operation === "create" ? createBrandSchema : updateBrandSchema;
      const input = schema.parse({
        ...Object.fromEntries(form),
        isActive: form.has("isActive"),
        isFeatured: form.has("isFeatured"),
      });
      const brand =
        operation === "create"
          ? await createBrand(input)
          : await updateBrand(id, input);
      id = brand.id;
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
    console.error("Brand administration failed", error);
    return { ok: false, error: "ذخیرهٔ تغییرات انجام نشد؛ دوباره تلاش کنید" };
  }
}
