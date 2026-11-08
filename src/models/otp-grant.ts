import "server-only";
import { Schema, model, models, type Model } from "mongoose";

interface IOtpGrant {
  _id: string;
  user: string;
  sessionVersion: number;
  purpose: "initial-password";
  expiresAt: Date;
}
const schema = new Schema<IOtpGrant>(
  {
    _id: { type: String, required: true },
    user: { type: String, required: true },
    sessionVersion: { type: Number, required: true },
    purpose: { type: String, enum: ["initial-password"], required: true },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const OtpGrant: Model<IOtpGrant> =
  (models.OtpGrant as Model<IOtpGrant> | undefined) ??
  model<IOtpGrant>("OtpGrant", schema);
