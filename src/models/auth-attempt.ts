import "server-only";
import { Schema, model, models, type Model } from "mongoose";

interface IAuthAttempt {
  _id: string;
  count: number;
  expiresAt: Date;
}
const schema = new Schema<IAuthAttempt>(
  {
    _id: { type: String, required: true },
    count: { type: Number, default: 0, required: true },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const AuthAttempt: Model<IAuthAttempt> =
  (models.AuthAttempt as Model<IAuthAttempt> | undefined) ??
  model<IAuthAttempt>("AuthAttempt", schema);
