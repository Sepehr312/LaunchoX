import "server-only";

import { Schema, model, models, type Model } from "mongoose";

export interface IUploadedImage {
  data: Buffer;
  contentType: string;
  referenceRevision: number;
  createdAt: Date;
  updatedAt: Date;
}

const uploadedImageSchema = new Schema<IUploadedImage>(
  {
    data: { type: Buffer, required: true, select: false },
    referenceRevision: { type: Number, default: 0 },
    contentType: {
      type: String,
      required: true,
      enum: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    },
  },
  { timestamps: true },
);
uploadedImageSchema.index({ createdAt: 1, _id: 1 });

export const UploadedImage: Model<IUploadedImage> =
  (models.UploadedImage as Model<IUploadedImage> | undefined) ??
  model<IUploadedImage>("UploadedImage", uploadedImageSchema);
