import { z } from "zod";
import { IMAGE_POLICY, imageSizeMessage } from "@/validations/image-policy";

export const imageFileSchema = z
  .file()
  .min(1, "فایل تصویر خالی است")
  .max(IMAGE_POLICY.maxFileBytes, imageSizeMessage)
  .mime(
    [...IMAGE_POLICY.mimeTypes],
    "تصویر باید از نوع PNG، JPEG، WebP یا GIF باشد",
  );

export const imageUploadResultSchema = z.object({
  data: z.object({ url: z.string().regex(/^\/api\/images\/[a-f0-9]{24}$/) }),
});
