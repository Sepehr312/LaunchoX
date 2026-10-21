import "server-only";
import { Schema, model, models, type Model, type Types } from "mongoose";
import { modelOptions, type Timestamps } from "@/lib/model-shared";

interface IAdminOwnership extends Timestamps {
  _id: string;
  owner: Types.ObjectId;
  failedAttempts: number;
  blockedUntil: Date;
}

const schema = new Schema<IAdminOwnership>(
  {
    _id: { type: String, enum: ["store-owner"], required: true },
    owner: { type: Schema.Types.ObjectId, required: true },
    failedAttempts: { type: Number, default: 0, min: 0 },
    blockedUntil: { type: Date, default: () => new Date(0) },
  },
  modelOptions,
);

export const AdminOwnership: Model<IAdminOwnership> =
  (models.AdminOwnership as Model<IAdminOwnership> | undefined) ??
  model<IAdminOwnership>("AdminOwnership", schema);
