import "server-only";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { AppError } from "@/lib/errors";
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

export async function setUserActive(input: unknown): Promise<{ id: string }> {
  const admin = await requireAdmin();
  const data = userActiveSchema.parse(input);
  if (!data.isActive && data.id.toLowerCase() === admin.id.toLowerCase())
    throw new AppError("نمی‌توانید حساب خودتان را غیرفعال کنید", "CONFLICT");
  await connectDB();
  const user = await User.findByIdAndUpdate(
    data.id,
    { $set: { isActive: data.isActive } },
    { returnDocument: "after", runValidators: true },
  )
    .select("_id")
    .lean();
  if (!user) throw new AppError("کاربر پیدا نشد", "NOT_FOUND");
  return { id: String(user._id) };
}

export async function setUserRole(input: unknown): Promise<{ id: string }> {
  const admin = await requireAdmin();
  const data = userRoleSchema.parse(input);
  if (data.id.toLowerCase() === admin.id.toLowerCase())
    throw new AppError("نمی‌توانید نقش حساب خودتان را تغییر دهید", "CONFLICT");
  await connectDB();
  const user = await User.findByIdAndUpdate(
    data.id,
    { $set: { role: data.role } },
    { returnDocument: "after", runValidators: true },
  )
    .select("_id")
    .lean();
  if (!user) throw new AppError("کاربر پیدا نشد", "NOT_FOUND");
  return { id: String(user._id) };
}
