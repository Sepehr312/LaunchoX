import "server-only";
import { compare } from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { objectIdSchema } from "@/validations/common";
import { mobilePasswordSchema } from "@/validations/otp";

// A public, non-account hash keeps missing and passwordless lookups on the bcrypt path.
const timingHash =
  "$2b$12$USbX.oRx3yUnc7a2l6YSfuSAzXCo3KHrvevns55hoEZU2/FllizPC";

export async function getUserAccess(input: unknown) {
  const id = objectIdSchema.safeParse(input);
  if (!id.success) return null;
  await connectDB();
  const user = await User.findById(id.data)
    .select("role isActive sessionVersion")
    .lean();
  return user
    ? {
        role: user.role,
        isActive: user.isActive,
        sessionVersion: user.sessionVersion ?? 0,
      }
    : null;
}
export async function authenticateUser(input: unknown) {
  const mobile = mobilePasswordSchema.safeParse(input);
  if (!mobile.success) return null;
  await connectDB();
  const user = await User.findOne({
    mobile: mobile.data.mobile,
    $or: [{ mobileVerifiedAt: { $type: "date" } }, { role: "admin" }],
  })
    .select("+passwordHash")
    .lean();
  const passwordMatches = await compare(
    mobile.data.password,
    user?.passwordHash ?? timingHash,
  );
  if (!user || !user.isActive || !user.passwordHash || !passwordMatches)
    return null;
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    ...(user.sessionVersion ? { sessionVersion: user.sessionVersion } : {}),
  };
}
