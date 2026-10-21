import "server-only";

import sharp from "sharp";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { UploadedImage } from "@/models/uploaded-image";
import { imageFileSchema } from "@/validations/image";
import { IMAGE_POLICY } from "@/validations/image-policy";
import { objectIdSchema } from "@/validations/common";
import { validateStaticPng } from "@/lib/png";

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
  if (file.type === "image/png") validateStaticPng(data);
  try {
    const decoder = sharp(data, {
      failOn: "warning",
      limitInputPixels: IMAGE_POLICY.maxPixels,
      animated: true,
    });
    const metadata = await decoder.metadata();
    const formats: Record<string, string> = {
      png: "image/png",
      jpeg: "image/jpeg",
      webp: "image/webp",
      gif: "image/gif",
    };
    const width = metadata.width ?? 0;
    const height = metadata.pageHeight ?? metadata.height ?? 0;
    const frames = metadata.pages ?? 1;
    if (
      formats[metadata.format ?? ""] !== file.type ||
      !width ||
      !height ||
      width > IMAGE_POLICY.maxDimension ||
      height > IMAGE_POLICY.maxDimension ||
      frames > IMAGE_POLICY.maxFrames ||
      width * height * frames > IMAGE_POLICY.maxPixels
    )
      throw new Error("Image dimensions or format exceed policy");
    // Decode every frame, including pixel data: metadata/signatures alone accept corrupt files.
    await decoder.timeout({ seconds: 10 }).raw().toBuffer();
  } catch {
    throw new AppError(
      "تصویر خراب است یا ابعاد آن بیش از حد مجاز است",
      "VALIDATION",
    );
  }
  await connectDB();
  const image = await UploadedImage.create({ data, contentType: file.type });
  return { url: `/api/images/${image._id.toString()}` };
}

export async function getImage(
  id: string,
): Promise<{ data: Uint8Array; contentType: string } | null> {
  objectIdSchema.parse(id);
  await connectDB();
  const image = await UploadedImage.findById(id).select("+data").lean();
  return image
    ? {
        data: new Uint8Array(
          image.data instanceof mongoose.mongo.Binary
            ? image.data.value()
            : image.data,
        ),
        contentType: image.contentType,
      }
    : null;
}
