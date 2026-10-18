import "server-only";

import { connectDB } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { UploadedImage } from "@/models/uploaded-image";
import { imageFileSchema } from "@/validations/image";

export async function uploadImage(file: File): Promise<{ url: string }> {
  imageFileSchema.parse(file);
  const data = Buffer.from(await file.arrayBuffer());
  const signatures: Record<string, boolean> = {
    "image/png": data
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    "image/jpeg": data[0] === 255 && data[1] === 216 && data[2] === 255,
    "image/gif": ["GIF87a", "GIF89a"].includes(data.toString("ascii", 0, 6)),
    "image/webp":
      data.toString("ascii", 0, 4) === "RIFF" &&
      data.toString("ascii", 8, 12) === "WEBP",
  };
  if (!signatures[file.type])
    throw new AppError("محتوای فایل با نوع تصویر سازگار نیست", "VALIDATION");
  await connectDB();
  const image = await UploadedImage.create({ data, contentType: file.type });
  return { url: `/api/images/${image._id.toString()}` };
}

export async function getImage(
  id: string,
): Promise<{ data: Uint8Array; contentType: string } | null> {
  await connectDB();
  const image = await UploadedImage.findById(id).select("+data").exec();
  return image
    ? { data: new Uint8Array(image.data), contentType: image.contentType }
    : null;
}
