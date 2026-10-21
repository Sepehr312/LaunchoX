import "server-only";

import { z } from "zod";
import { AppError, PayloadTooLargeError } from "@/lib/errors";
import { imageFileSchema } from "@/validations/image";
import { IMAGE_POLICY, imageSizeMessage } from "@/validations/image-policy";

export async function readImageUpload(request: Request): Promise<File> {
  const length = request.headers.get("content-length");
  if (length !== null) {
    const parsed = z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .safeParse(length);
    if (!parsed.success)
      throw new AppError("اندازهٔ درخواست معتبر نیست", "VALIDATION");
    if (parsed.data > IMAGE_POLICY.maxRequestBytes)
      throw new PayloadTooLargeError(imageSizeMessage);
  }
  const contentType = z
    .string()
    .regex(/^multipart\/form-data\s*;/i)
    .safeParse(request.headers.get("content-type"));
  if (!contentType.success || !request.body)
    throw new AppError("درخواست بارگذاری معتبر نیست", "VALIDATION");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > IMAGE_POLICY.maxRequestBytes) {
        void reader.cancel().catch(() => undefined);
        throw new PayloadTooLargeError(imageSizeMessage);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  let form: FormData;
  try {
    // The native multipart parser only sees a body whose actual bytes were bounded.
    form = await new Response(Buffer.concat(chunks, size), {
      headers: { "content-type": contentType.data },
    }).formData();
  } catch {
    throw new AppError("دادهٔ بارگذاری ناقص یا نامعتبر است", "VALIDATION");
  }
  if (Array.from(form.keys()).length !== 1 || form.getAll("image").length !== 1)
    throw new AppError("فقط یک تصویر ارسال کنید", "VALIDATION");
  const file = form.get("image");
  if (file instanceof File && file.size > IMAGE_POLICY.maxFileBytes)
    throw new PayloadTooLargeError(imageSizeMessage);
  return imageFileSchema.parse(file);
}
