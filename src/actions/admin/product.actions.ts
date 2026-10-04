"use server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { AppError, type ActionResult } from "@/lib/errors";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  setProductActive,
} from "@/services/product.service";
import { productSchema } from "@/validations/product";
import { objectIdSchema, booleanSchema } from "@/validations/common";

export async function productAction(
  _state: ActionResult<{ id: string }> | undefined,
  form: FormData,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  try {
    const operation = z
      .enum(["create", "edit", "active", "delete"])
      .parse(form.get("operation"));
    let id = operation === "create" ? "" : objectIdSchema.parse(form.get("id"));
    if (operation === "delete") await deleteProduct(id);
    else if (operation === "active")
      await setProductActive(id, booleanSchema.parse(form.get("isActive")));
    else {
      const input = productSchema.parse({
        ...Object.fromEntries(form),
        images: form.getAll("images"),
        attributes: form.getAll("attributeKey").map((key, index) => ({
          key,
          value: form.getAll("attributeValue")[index],
        })),
        isActive: form.has("isActive"),
        isFeatured: form.has("isFeatured"),
      });
      const product =
        operation === "create"
          ? await createProduct(input)
          : await updateProduct(id, input);
      id = product.id;
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
    console.error("Product administration failed", error);
    return { ok: false, error: "ذخیرهٔ تغییرات انجام نشد؛ دوباره تلاش کنید" };
  }
}
