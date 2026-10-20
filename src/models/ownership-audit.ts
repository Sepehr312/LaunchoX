import "server-only";
import { Schema, model, models, type Model, type Types } from "mongoose";
import { modelOptions, type StoredDocument } from "@/lib/model-shared";

interface IOwnershipAudit extends StoredDocument {
  previousOwner?: Types.ObjectId;
  owner: Types.ObjectId;
  operator: string;
  reason: string;
  previousRole: "admin" | "customer";
}

const schema = new Schema<IOwnershipAudit>(
  {
    previousOwner: { type: Schema.Types.ObjectId, immutable: true },
    owner: { type: Schema.Types.ObjectId, required: true, immutable: true },
    operator: { type: String, required: true, immutable: true },
    reason: { type: String, required: true, immutable: true },
    previousRole: {
      type: String,
      enum: ["admin", "customer"],
      required: true,
      immutable: true,
    },
  },
  modelOptions,
);

export const OwnershipAudit: Model<IOwnershipAudit> =
  (models.OwnershipAudit as Model<IOwnershipAudit> | undefined) ??
  model<IOwnershipAudit>("OwnershipAudit", schema);
