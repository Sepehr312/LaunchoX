import "server-only";

import { Schema, model, models, type Model } from "mongoose";

export interface IUploadedImage {
  data: Buffer;
  contentType: string;
}

const uploadedImageSchema = new Schema<IUploadedImage>(
  {
    data: { type: Buffer, required: true, select: false },
    contentType: {
      type: String,
      required: true,
      enum: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    },
  },
  { timestamps: true },
);

export const UploadedImage: Model<IUploadedImage> =
  (models.UploadedImage as Model<IUploadedImage> | undefined) ??
  model<IUploadedImage>("UploadedImage", uploadedImageSchema);
