import "server-only";
import { Schema, model, models, type Model } from "mongoose";
interface Content {
  key: string;
  data: unknown;
}
const schema = new Schema<Content>(
  {
    key: { type: String, required: true, unique: true },
    data: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);
export const ManagedContent: Model<Content> =
  (models.ManagedContent as Model<Content> | undefined) ??
  model<Content>("ManagedContent", schema);
