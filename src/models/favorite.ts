import "server-only";
import { Schema, model, models, type Model, type Types } from "mongoose";
interface Entry {
  user: Types.ObjectId;
  product: Types.ObjectId;
}
const schema = new Schema<Entry>(
  {
    user: { type: Schema.Types.ObjectId, required: true },
    product: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);
schema.index({ user: 1, product: 1 }, { unique: true });
export const Favorite: Model<Entry> =
  (models.Favorite as Model<Entry> | undefined) ??
  model<Entry>("Favorite", schema);
