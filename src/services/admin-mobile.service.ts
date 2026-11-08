import "server-only";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { User } from "@/models/user";
import { AdminOwnership } from "@/models/admin-ownership";
import { consumeStoredAuthAttempt } from "@/services/auth-attempt.service";
import {
  consumeReservedOtp,
  requestOtp,
  reserveOtp,
} from "@/services/otp.service";
import { withUserAccessTransaction } from "@/services/user-access-transaction";
import { loginMobileSchema, otpVerifySchema } from "@/validations/otp";
import { passwordSchema } from "@/validations/auth";
import { objectIdSchema } from "@/validations/common";

type Actor = { id: string; sessionVersion?: number };
const denied = () => new AppError("تأیید اطلاعات مدیر ممکن نشد", "FORBIDDEN");
const enrollmentSchema = z.object({
  mobile: loginMobileSchema,
  confirmationPassword: z.string().min(1).max(72),
});
export async function requestAdminEnrollment(
  input: unknown,
  actor: Actor,
  ip: string,
) {
  const data = enrollmentSchema.parse(input);
  if (!(await consumeStoredAuthAttempt("login", ip, actor.id))) throw denied();
  await connectDB();
  const user = await User.findOne({
    _id: actor.id,
    role: "admin",
    isActive: true,
    sessionVersion: actor.sessionVersion ?? 0,
    mobileVerifiedAt: { $exists: false },
  })
    .select("+passwordHash")
    .lean();
  if (
    !user?.passwordHash ||
    !(await compare(data.confirmationPassword, user.passwordHash))
  )
    throw denied();
  return requestOtp(
    { mobile: data.mobile, purpose: "admin-enrollment" },
    ip,
    actor,
  );
}

export async function finishAdminEnrollment(
  input: unknown,
  actor: Actor,
  ip: string,
) {
  const data = enrollmentSchema.and(otpVerifySchema).parse(input);
  if (data.purpose !== "admin-enrollment") throw denied();
  if (!(await consumeStoredAuthAttempt("login", ip, actor.id))) throw denied();
  const ticket = await reserveOtp(data, ip, actor);
  try {
    await withUserAccessTransaction(async (session) => {
      const user = await User.findOne({
        _id: actor.id,
        role: "admin",
        isActive: true,
        sessionVersion: actor.sessionVersion ?? 0,
        mobileVerifiedAt: { $exists: false },
      })
        .select("+passwordHash")
        .session(session)
        .lean();
      if (
        !user?.passwordHash ||
        !(await compare(data.confirmationPassword, user.passwordHash))
      )
        throw denied();
      await consumeReservedOtp(ticket, session);
      await User.updateOne(
        { _id: user._id },
        {
          $set: { mobile: data.mobile, mobileVerifiedAt: new Date() },
          $inc: { sessionVersion: 1 },
        },
        { session, runValidators: true },
      );
    });
  } catch {
    throw denied();
  }
}

// Server operators run this explicit maintenance operation; it never promotes a user or verifies a number.
export async function configureOwnerMobile(input: unknown) {
  const data = z
    .object({
      expectedOwnerId: objectIdSchema,
      mobile: loginMobileSchema,
      password: passwordSchema,
    })
    .parse(input);
  const passwordHash = await hash(data.password, 12);
  await withUserAccessTransaction(async (session) => {
    const ownership = await AdminOwnership.findById("store-owner")
      .session(session)
      .lean();
    if (!ownership || String(ownership.owner) !== data.expectedOwnerId)
      throw denied();
    const owner = await User.findOne({
      _id: ownership.owner,
      role: "admin",
      isActive: true,
    })
      .session(session)
      .lean();
    if (!owner || (owner.mobileVerifiedAt && owner.mobile !== data.mobile))
      throw denied();
    await User.updateOne(
      { _id: owner._id },
      {
        $set: { mobile: data.mobile, passwordHash },
        $inc: { sessionVersion: 1 },
      },
      { session, runValidators: true },
    );
  });
}
