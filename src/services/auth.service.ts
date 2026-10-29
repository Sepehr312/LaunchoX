import "server-only";
import { hash, compare } from "bcryptjs";
import { connectDB } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { User } from "@/models/user";
import { objectIdSchema } from "@/validations/common";

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
export async function authenticateUser(input: {
  email: string;
  password: string;
}) {
  await connectDB();
  const user = await User.findOne({ email: input.email })
    .select("+passwordHash")
    .lean();
  if (
    !user ||
    !user.isActive ||
    !(await compare(input.password, user.passwordHash))
  )
    return null;
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    ...(user.sessionVersion ? { sessionVersion: user.sessionVersion } : {}),
  };
}

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
}) {
  await connectDB();
  try {
    const user = await User.create({
      name: data.name,
      email: data.email,
      passwordHash: await hash(data.password, 12),
      role: "customer",
    });
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new AppError("این ایمیل قبلاً ثبت شده است", "CONFLICT");
    }
    throw error;
  }
}
