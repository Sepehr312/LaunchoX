import { z } from "zod";

export const imageFileSchema = z
  .file()
  .min(1, "فایل تصویر خالی است")
  .max(5 * 1024 * 1024, "حجم تصویر باید حداکثر ۵ مگابایت باشد")
  .mime(
    ["image/jpeg", "image/png", "image/webp", "image/gif"],
    "تصویر باید از نوع PNG، JPEG، WebP یا GIF باشد",
  );

export const imageUploadResultSchema = z.object({
  data: z.object({ url: z.string().regex(/^\/api\/images\/[a-f0-9]{24}$/) }),
});
