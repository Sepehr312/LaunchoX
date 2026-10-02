import "server-only";
import { Schema, model, models, type Model } from "mongoose";
import {
  integerField,
  modelOptions,
  requiredText,
  type Timestamps,
} from "@/lib/model-shared";

export interface ICounter extends Timestamps {
  _id: string;
  seq: number;
}
const counterSchema = new Schema<ICounter>(
  {
    _id: requiredText,
    seq: {
      ...integerField,
      required: [true, "شمارنده الزامی است"],
      default: 100000,
    },
  },
  modelOptions,
);
export const Counter: Model<ICounter> =
  (models.Counter as Model<ICounter> | undefined) ??
  model<ICounter>("Counter", counterSchema);
