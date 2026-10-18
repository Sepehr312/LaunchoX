import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { uploadImage } from "@/services/image.service";
import { imageFileSchema } from "@/validations/image";

export async function POST(request: Request) {
  await requireAdmin();
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: "درخواست معتبر نیست" }, { status: 403 });
  if (Number(request.headers.get("content-length")) > 6 * 1024 * 1024)
    return Response.json(
      { error: "حجم تصویر باید حداکثر ۵ مگابایت باشد" },
      { status: 413 },
    );
  try {
    const form = await request.formData();
    const file = imageFileSchema.parse(form.get("image"));
    return Response.json({ data: await uploadImage(file) }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError)
      return Response.json(
        { error: error.issues[0]?.message ?? "تصویر معتبر نیست" },
        { status: 400 },
      );
    if (error instanceof AppError)
      return Response.json({ error: error.message }, { status: 400 });
    console.error("Image upload failed", error);
    return Response.json(
      { error: "بارگذاری تصویر انجام نشد؛ دوباره تلاش کنید" },
      { status: 500 },
    );
  }
}
