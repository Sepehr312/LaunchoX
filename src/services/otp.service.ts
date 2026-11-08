import "server-only";
import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import type { ClientSession } from "mongoose";
import { connectDB } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { OtpChallenge } from "@/models/otp-challenge";
import { OtpGrant } from "@/models/otp-grant";
import { User } from "@/models/user";
import {
  consumeOtpLimit,
  consumeOtpCooldown,
} from "@/services/auth-attempt.service";
import { sendOtpSms } from "@/services/sms-ir.service";
import { withUserAccessTransaction } from "@/services/user-access-transaction";
import {
  otpRequestSchema,
  otpVerifySchema,
  challengeIdSchema,
} from "@/validations/otp";

export const OTP_TTL_MS = 300_000;
const failure = () =>
  new AppError(
    "کد یا اطلاعات درخواست معتبر نیست؛ دوباره تلاش کنید",
    "VALIDATION",
  );
const limited = () =>
  new AppError(
    "تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید",
    "FORBIDDEN",
  );
export function otpDigest(value: string): string {
  return createHmac("sha256", getEnv().AUTH_SECRET)
    .update(`otp:v1:${value}`)
    .digest("hex");
}
type Actor = { id: string; sessionVersion?: number };

export async function requestOtp(input: unknown, ip: string, actor?: Actor) {
  const data = otpRequestSchema.parse(input);
  if (
    ["set-password", "change-mobile", "admin-enrollment"].includes(
      data.purpose,
    ) &&
    !actor
  )
    throw failure();
  await connectDB();
  if (actor) {
    const user = await User.findOne({
      _id: actor.id,
      isActive: true,
      sessionVersion: actor.sessionVersion ?? 0,
    }).lean();
    if (
      !user ||
      (data.purpose === "set-password" &&
        (!user.mobileVerifiedAt || data.mobile !== user.mobile)) ||
      (data.purpose === "admin-enrollment" &&
        (user.role !== "admin" || user.mobileVerifiedAt))
    )
      throw failure();
  }
  if (!(await consumeOtpLimit("send", data.mobile, ip))) throw limited();
  if (!(await consumeOtpCooldown(data.mobile))) throw limited();
  const now = Date.now();
  const challengeId = randomBytes(32).toString("hex");
  const code = String(randomInt(100000, 1000000));
  const slot = otpDigest(
    `slot:${data.mobile}:${data.purpose}:${actor?.id ?? ""}`,
  );
  try {
    await OtpChallenge.findOneAndUpdate(
      { _id: slot, nextSendAt: { $lte: new Date(now) } },
      {
        $set: {
          ...data,
          owner: actor?.id ?? "",
          sessionVersion: actor?.sessionVersion ?? 0,
          challengeId,
          digest: otpDigest(
            `${challengeId}:${data.mobile}:${data.purpose}:${code}`,
          ),
          state: "pending",
          attempts: 0,
          nextSendAt: new Date(now + 60_000),
          expiresAt: new Date(now + OTP_TTL_MS),
          purgeAt: new Date(now + 3600000),
        },
      },
      { upsert: true, setDefaultsOnInsert: false },
    );
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    )
      throw limited();
    throw error;
  }
  try {
    await sendOtpSms(data.mobile, code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    const active = await OtpChallenge.updateOne(
      { _id: slot, challengeId, state: "pending" },
      { $set: { state: "active", expiresAt } },
    );
    if (!active.modifiedCount) throw failure();
    return {
      challengeId,
      mobile: data.mobile,
      expiresAt: expiresAt.toISOString(),
      resendAt: new Date(now + 60_000).toISOString(),
    };
  } catch (error: unknown) {
    await OtpChallenge.updateOne(
      { _id: slot, challengeId },
      { $set: { state: "failed" } },
    );
    throw error;
  }
}

// Reserve attempts outside the operation transaction so failed or aborted operations still count.
export async function reserveOtp(input: unknown, ip: string, actor?: Actor) {
  const data = otpVerifySchema.parse(input);
  if (!(await consumeOtpLimit("verify", data.mobile, ip))) throw limited();
  const challenge = await OtpChallenge.findOneAndUpdate(
    {
      challengeId: data.challengeId,
      mobile: data.mobile,
      purpose: data.purpose,
      owner: actor?.id ?? "",
      sessionVersion: actor?.sessionVersion ?? 0,
      state: "active",
      expiresAt: { $gt: new Date() },
      attempts: { $lt: 5 },
    },
    { $inc: { attempts: 1 } },
    { returnDocument: "after" },
  )
    .select("+digest")
    .lean();
  const expected = otpDigest(
    `${data.challengeId}:${data.mobile}:${data.purpose}:${data.code}`,
  );
  if (
    !challenge ||
    !timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(challenge.digest, "hex"),
    )
  )
    throw failure();
  return {
    id: challenge._id,
    challengeId: challenge.challengeId,
    mobile: data.mobile,
    purpose: data.purpose,
  };
}

export async function consumeReservedOtp(
  ticket: Awaited<ReturnType<typeof reserveOtp>>,
  session: ClientSession,
) {
  const consumed = await OtpChallenge.updateOne(
    {
      _id: ticket.id,
      challengeId: ticket.challengeId,
      state: "active",
      expiresAt: { $gt: new Date() },
    },
    { $set: { state: "consumed" } },
    { session },
  );
  if (!consumed.modifiedCount) throw failure();
}

export async function authenticateOtp(input: unknown, ip: string) {
  const parsed = otpVerifySchema.parse(input);
  if (parsed.purpose !== "login") throw failure();
  const ticket = await reserveOtp(parsed, ip);
  return withUserAccessTransaction(async (session) => {
    await consumeReservedOtp(ticket, session);
    let user = await User.findOne({ mobile: ticket.mobile })
      .session(session)
      .lean();
    // Historical profile numbers are not proof of ownership and cannot claim existing accounts.
    if (user && (!user.isActive || !user.mobileVerifiedAt)) throw failure();
    const created = !user;
    if (!user) {
      const [newUser] = await User.create(
        [
          {
            mobile: ticket.mobile,
            mobileVerifiedAt: new Date(),
            role: "customer",
          },
        ],
        { session },
      );
      user = newUser.toObject();
    }
    let initialPasswordGrant: string | undefined;
    if (created) {
      initialPasswordGrant = randomBytes(32).toString("hex");
      await OtpGrant.create(
        [
          {
            _id: otpDigest(initialPasswordGrant),
            user: String(user._id),
            sessionVersion: user.sessionVersion ?? 0,
            purpose: "initial-password",
            expiresAt: new Date(Date.now() + 300000),
          },
        ],
        { session },
      );
    }
    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      sessionVersion: user.sessionVersion ?? 0,
      initialPasswordGrant,
    };
  });
}

export async function hasInitialPasswordGrant(token: unknown, actor: Actor) {
  const parsed = challengeIdSchema.safeParse(token);
  if (!parsed.success) return false;
  await connectDB();
  return Boolean(
    await OtpGrant.exists({
      _id: otpDigest(parsed.data),
      user: actor.id,
      sessionVersion: actor.sessionVersion ?? 0,
      purpose: "initial-password",
      expiresAt: { $gt: new Date() },
    }),
  );
}

export async function discardInitialPasswordGrant(
  token: unknown,
  actor: Actor,
) {
  const parsed = challengeIdSchema.safeParse(token);
  if (!parsed.success) return;
  await connectDB();
  await OtpGrant.deleteOne({ _id: otpDigest(parsed.data), user: actor.id });
}
