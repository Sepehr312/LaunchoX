import "server-only";
import { Schema, model, models, type Model } from "mongoose";

interface IOtpChallenge {
  _id: string;
  challengeId: string;
  mobile: string;
  purpose: string;
  owner: string;
  sessionVersion: number;
  digest: string;
  attempts: number;
  state: "pending" | "active" | "consumed" | "failed";
  nextSendAt: Date;
  expiresAt: Date;
  purgeAt: Date;
}
const schema = new Schema<IOtpChallenge>(
  {
    _id: { type: String, required: true },
    challengeId: { type: String, required: true },
    mobile: { type: String, required: true },
    purpose: { type: String, required: true },
    owner: { type: String, default: "" },
    sessionVersion: { type: Number, default: 0 },
    digest: { type: String, required: true, select: false },
    attempts: { type: Number, default: 0 },
    state: {
      type: String,
      enum: ["pending", "active", "consumed", "failed"],
      required: true,
    },
    nextSendAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    purgeAt: { type: Date, required: true },
  },
  { versionKey: false, timestamps: true },
);
schema.index({ challengeId: 1 }, { unique: true });
schema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
export const OtpChallenge: Model<IOtpChallenge> =
  (models.OtpChallenge as Model<IOtpChallenge> | undefined) ??
  model<IOtpChallenge>("OtpChallenge", schema);
