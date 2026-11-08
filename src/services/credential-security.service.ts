import "server-only";
import { hash } from "bcryptjs";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { User } from "@/models/user";
import { OtpGrant } from "@/models/otp-grant";
import {
  consumeReservedOtp,
  otpDigest,
  reserveOtp,
} from "@/services/otp.service";
import { withUserAccessTransaction } from "@/services/user-access-transaction";
import {
  challengeIdSchema,
  newPasswordSchema,
  otpVerifySchema,
} from "@/validations/otp";

type Actor = { id: string; sessionVersion?: number };
const denied = () =>
  new AppError("مجوز تغییر اطلاعات معتبر نیست؛ دوباره تأیید کنید", "FORBIDDEN");

export async function setInitialPassword(
  input: unknown,
  token: unknown,
  actor: Actor,
) {
  const data = newPasswordSchema.parse(input);
  const grantId = otpDigest(challengeIdSchema.parse(token));
  const passwordHash = await hash(data.password, 12);
  await withUserAccessTransaction(async (session) => {
    const grant = await OtpGrant.findOneAndDelete(
      {
        _id: grantId,
        user: actor.id,
        sessionVersion: actor.sessionVersion ?? 0,
        purpose: "initial-password",
        expiresAt: { $gt: new Date() },
      },
      { session },
    );
    if (!grant) throw denied();
    const result = await User.updateOne(
      {
        _id: actor.id,
        isActive: true,
        sessionVersion: actor.sessionVersion ?? 0,
        passwordHash: { $exists: false },
      },
      { $set: { passwordHash }, $inc: { sessionVersion: 1 } },
      { session },
    );
    if (!result.modifiedCount) throw denied();
  });
}

export async function setPasswordWithOtp(
  input: unknown,
  ip: string,
  actor?: Actor,
) {
  const data = otpVerifySchema.and(newPasswordSchema).parse(input);
  if (data.purpose !== "set-password" && data.purpose !== "recovery")
    throw denied();
  if (data.purpose === "set-password" && !actor) throw denied();
  if (data.purpose === "recovery" && actor) throw denied();
  const ticket = await reserveOtp(data, ip, actor);
  const passwordHash = await hash(data.password, 12);
  await withUserAccessTransaction(async (session) => {
    await consumeReservedOtp(ticket, session);
    const user = await User.findOne({
      mobile: data.mobile,
      isActive: true,
      mobileVerifiedAt: { $type: "date" },
      ...(actor
        ? {
            _id: actor.id,
            sessionVersion: actor.sessionVersion ?? 0,
            passwordHash: { $exists: false },
          }
        : {}),
    })
      .session(session)
      .lean();
    if (!user) throw denied();
    await User.updateOne(
      { _id: user._id },
      { $set: { passwordHash }, $inc: { sessionVersion: 1 } },
      { session },
    );
  });
}

export async function changeMobileWithOtp(
  input: unknown,
  ip: string,
  actor: Actor,
) {
  const data = z
    .object({ current: otpVerifySchema, next: otpVerifySchema })
    .parse(input);
  if (
    data.current.purpose !== "change-mobile" ||
    data.next.purpose !== "change-mobile" ||
    data.current.mobile === data.next.mobile
  )
    throw denied();
  const current = await reserveOtp(data.current, ip, actor);
  const next = await reserveOtp(data.next, ip, actor);
  try {
    await withUserAccessTransaction(async (session) => {
      await consumeReservedOtp(current, session);
      await consumeReservedOtp(next, session);
      const updated = await User.updateOne(
        {
          _id: actor.id,
          isActive: true,
          sessionVersion: actor.sessionVersion ?? 0,
          mobile: current.mobile,
          mobileVerifiedAt: { $type: "date" },
        },
        {
          $set: { mobile: next.mobile, mobileVerifiedAt: new Date() },
          $inc: { sessionVersion: 1 },
        },
        { session, runValidators: true },
      );
      if (!updated.modifiedCount) throw denied();
    });
  } catch {
    throw denied();
  }
}
