import "server-only";
import { z } from "zod";
import { hash } from "bcryptjs";
import { AppError } from "@/lib/errors";
import { AdminOwnership } from "@/models/admin-ownership";
import { OwnershipAudit } from "@/models/ownership-audit";
import { User } from "@/models/user";
import { objectIdSchema } from "@/validations/common";
import { withUserAccessTransaction } from "@/services/user-access-transaction";

const common = {
  targetId: objectIdSchema,
  operator: z.string().trim().min(2).max(100),
  reason: z.string().trim().min(8).max(500),
};
export const ownerMaintenanceSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("bootstrap"), ...common }),
  z.object({
    operation: z.literal("transfer"),
    expectedOwnerId: objectIdSchema,
    ...common,
  }),
  z.object({
    operation: z.literal("create"),
    email: z.email().toLowerCase(),
    password: z
      .string()
      .min(20)
      .max(72)
      .refine((value) => new TextEncoder().encode(value).length <= 72),
    expectedOwnerId: objectIdSchema.optional(),
    operator: common.operator,
    reason: common.reason,
  }),
]);

// Trusted server CLI only. Never expose this function through an action or route.
export async function maintainOwner(
  input: unknown,
): Promise<{ ownerId: string }> {
  const data = ownerMaintenanceSchema.parse(input);
  return withUserAccessTransaction(async (session) => {
    const current = await AdminOwnership.findById("store-owner")
      .session(session)
      .lean();
    if (data.operation === "bootstrap" && current)
      throw new AppError("مالک قبلاً تعیین شده است", "CONFLICT");
    if (
      data.operation === "create" &&
      ((current &&
        String(current.owner) !== data.expectedOwnerId?.toLowerCase()) ||
        (!current && data.expectedOwnerId))
    )
      throw new AppError(
        "مالک فعلی با شناسهٔ مورد انتظار مطابقت ندارد",
        "CONFLICT",
      );
    if (
      data.operation === "transfer" &&
      (!current || String(current.owner) !== data.expectedOwnerId.toLowerCase())
    )
      throw new AppError(
        "مالک فعلی با شناسهٔ مورد انتظار مطابقت ندارد",
        "CONFLICT",
      );
    if (
      data.operation !== "create" &&
      current &&
      String(current.owner) === data.targetId.toLowerCase()
    )
      throw new AppError("حساب مقصد همان مالک فعلی است", "CONFLICT");
    const target =
      data.operation === "create"
        ? (
            await User.create(
              [
                {
                  email: data.email,
                  name: "مالک فروشگاه",
                  passwordHash: await hash(data.password, 12),
                  role: "admin",
                  isActive: true,
                },
              ],
              { session },
            )
          )[0]
        : await User.findById(data.targetId).session(session).lean();
    if (!target?.isActive)
      throw new AppError("حساب مقصد باید موجود و فعال باشد", "VALIDATION");
    await User.updateOne(
      { _id: target._id },
      { $set: { role: "admin" } },
      { session, runValidators: true },
    );
    await AdminOwnership.updateOne(
      { _id: "store-owner" },
      {
        $set: {
          owner: target._id,
          failedAttempts: 0,
          blockedUntil: new Date(0),
        },
      },
      { upsert: true, session, runValidators: true },
    );
    await OwnershipAudit.create(
      [
        {
          previousOwner: current?.owner,
          owner: target._id,
          operator: data.operator,
          reason: data.reason,
          previousRole: target.role,
        },
      ],
      { session },
    );
    return { ownerId: String(target._id) };
  });
}
