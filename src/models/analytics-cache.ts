import "server-only";
import { Schema, model, models, type Model } from "mongoose";
import type { AnalyticsResult } from "@/types/analytics";

interface IAnalyticsCache {
  _id: string;
  result?: AnalyticsResult;
  expiresAt?: Date;
  leaseUntil?: Date;
  nextAttemptAt?: Date;
  owner?: string;
}
const schema = new Schema<IAnalyticsCache>(
  {
    _id: { type: String, required: true },
    result: Schema.Types.Mixed,
    expiresAt: Date,
    leaseUntil: Date,
    nextAttemptAt: Date,
    owner: String,
  },
  { timestamps: true, versionKey: false },
);

export const AnalyticsCache: Model<IAnalyticsCache> =
  (models.AnalyticsCache as Model<IAnalyticsCache> | undefined) ??
  model<IAnalyticsCache>("AnalyticsCache", schema);
