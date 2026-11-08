import "server-only";
import { Schema, model, models, type Model, type Types } from "mongoose";
import { modelOptions, type StoredDocument } from "@/lib/model-shared";
import { userRoles, type UserRole } from "@/types/domain";

interface IUserAccessAudit extends StoredDocument {
  actor: Types.ObjectId;
  actorEmail?: string;
  actorMobile?: string;
  target: Types.ObjectId;
  before: { role: UserRole; isActive: boolean; sessionVersion?: number };
  after: { role: UserRole; isActive: boolean; sessionVersion?: number };
}

const state = new Schema(
  {
    role: { type: String, enum: userRoles, required: true },
    isActive: { type: Boolean, required: true },
    sessionVersion: { type: Number, min: 0 },
  },
  { _id: false },
);
const schema = new Schema<IUserAccessAudit>(
  {
    actor: { type: Schema.Types.ObjectId, required: true, immutable: true },
    actorEmail: { type: String, immutable: true },
    actorMobile: { type: String, immutable: true },
    target: {
      type: Schema.Types.ObjectId,
      required: true,
      immutable: true,
      index: true,
    },
    before: { type: state, required: true, immutable: true },
    after: { type: state, required: true, immutable: true },
  },
  modelOptions,
);

export const UserAccessAudit: Model<IUserAccessAudit> =
  (models.UserAccessAudit as Model<IUserAccessAudit> | undefined) ??
  model<IUserAccessAudit>("UserAccessAudit", schema);
