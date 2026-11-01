import "server-only";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { compare } from "bcryptjs";
import { AdminOwnership } from "@/models/admin-ownership";
import { withUserAccessTransaction } from "@/services/user-access-transaction";
import { UserAccessAudit } from "@/models/user-access-audit";
import { User } from "@/models/user";
import { userActiveSchema, userRoleSchema } from "@/validations/admin-user";
import type { UserDTO } from "@/types/dto";

export type AdminUserDTO = Pick<
  UserDTO,
  "id" | "name" | "email" | "role" | "isActive"
>;

export async function listUsersAdmin(): Promise<AdminUserDTO[]> {
  await requireAdmin();
  await connectDB();
  const users = await User.find({})
    .select("name email role isActive")
    .sort({ role: 1, createdAt: -1, _id: -1 })
    .lean();
  return users.map((user) => ({
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  }));
}

export async function getUserManagementPermissions() {
  const admin = await requireAdmin();
  await connectDB();
  const actor = await User.findById(admin.id).lean();
  const ownership = await AdminOwnership.findById("store-owner").lean();
  return {
    canManageAdmins:
      actor?.role === "admin" &&
      actor.isActive &&
      String(ownership?.owner) === admin.id.toLowerCase(),
    ownerId: ownership ? String(ownership.owner) : null,
  };
}

type AccessChange = { id: string; confirmationPassword?: string } & (
  { role: "admin" | "customer" } | { isActive: boolean }
);

async function changeUserAccess(
  actorId: string,
  data: AccessChange,
): Promise<{ id: string }> {
  const result = await withUserAccessTransaction<{ id: string } | AppError>(
    async (session) => {
      const actor = await User.findById(actorId)
        .select("+passwordHash")
        .session(session)
        .lean();
      if (!actor?.isActive || actor.role !== "admin")
        throw new AppError("دسترسی مدیریت معتبر نیست", "FORBIDDEN");
      const target = await User.findById(data.id).session(session).lean();
      if (!target) throw new AppError("کاربر پیدا نشد", "NOT_FOUND");
      const ownership = await AdminOwnership.findById("store-owner")
        .session(session)
        .lean();
      const isOwner = String(ownership?.owner) === String(actor._id);
      const sensitive = "role" in data || target.role === "admin";
      if (String(ownership?.owner) === String(target._id))
        throw new AppError(
          "نقش و وضعیت حساب مالک از پنل قابل تغییر نیست",
          "CONFLICT",
        );
      if (sensitive && !isOwner)
        throw new AppError(
          "این عملیات فقط برای مالک فروشگاه مجاز است",
          "FORBIDDEN",
        );
      if (sensitive && ownership) {
        const now = new Date();
        if (ownership.blockedUntil > now)
          throw new AppError(
            "تعداد تلاش‌ها بیش از حد مجاز است؛ ۱۵ دقیقه بعد دوباره تلاش کنید",
            "FORBIDDEN",
          );
        if (
          !data.confirmationPassword ||
          !(await compare(data.confirmationPassword, actor.passwordHash))
        ) {
          const failedAttempts =
            ownership.blockedUntil.getTime() > 0
              ? 1
              : ownership.failedAttempts + 1;
          await AdminOwnership.updateOne(
            { _id: ownership._id },
            {
              $set: {
                failedAttempts,
                blockedUntil:
                  failedAttempts >= 5
                    ? new Date(now.getTime() + 15 * 60 * 1000)
                    : new Date(0),
              },
            },
            { session },
          );
          // Return the error so failed-attempt accounting commits before the caller throws.
          return new AppError("رمز تأیید مالک صحیح نیست", "FORBIDDEN");
        }
        await AdminOwnership.updateOne(
          { _id: ownership._id },
          { $set: { failedAttempts: 0, blockedUntil: new Date(0) } },
          { session },
        );
      }
      const before = { role: target.role, isActive: target.isActive };
      const after = {
        ...before,
        ...("role" in data ? { role: data.role } : { isActive: data.isActive }),
      };
      if (before.role === after.role && before.isActive === after.isActive)
        return { id: String(target._id) };
      if (
        before.role === "admin" &&
        before.isActive &&
        (after.role !== "admin" || !after.isActive)
      ) {
        const activeAdmins = await User.countDocuments({
          role: "admin",
          isActive: true,
        }).session(session);
        if (activeAdmins <= 1)
          throw new AppError(
            "آخرین ادمین فعال قابل حذف یا غیرفعال‌سازی نیست",
            "CONFLICT",
          );
      }
      if (String(target._id) === String(actor._id))
        throw new AppError(
          "نمی‌توانید نقش یا وضعیت حساب خودتان را تغییر دهید",
          "CONFLICT",
        );
      await User.updateOne(
        { _id: target._id },
        { $set: after },
        { session, runValidators: true },
      );
      await UserAccessAudit.create(
        [
          {
            actor: actor._id,
            actorEmail: actor.email,
            target: target._id,
            before,
            after,
          },
        ],
        { session },
      );
      return { id: String(target._id) };
    },
  );
  if (result instanceof AppError) throw result;
  return result;
}

export async function setUserActive(input: unknown): Promise<{ id: string }> {
  const admin = await requireAdmin();
  const data = userActiveSchema.parse(input);
  return changeUserAccess(admin.id, data);
}

export async function setUserRole(input: unknown): Promise<{ id: string }> {
  const admin = await requireAdmin();
  const data = userRoleSchema.parse(input);
  return changeUserAccess(admin.id, data);
}
