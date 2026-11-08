import "server-only";
import { createHmac } from "node:crypto";
import { connectDB } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { AuthAttempt } from "@/models/auth-attempt";
import { emailSchema, objectIdSchema } from "@/validations/common";
import { loginMobileSchema } from "@/validations/otp";

const windowMs = 15 * 60 * 1000;
export async function consumeStoredAuthAttempt(
  scope: "login" | "register",
  ip: string,
  identifier: unknown,
  now = Date.now(),
): Promise<boolean> {
  const parsed = emailSchema.safeParse(
    typeof identifier === "string" ? identifier.slice(0, 320) : identifier,
  );
  const mobile = loginMobileSchema.safeParse(identifier);
  const userId = objectIdSchema.safeParse(identifier);
  const account = parsed.success
    ? parsed.data
    : mobile.success
      ? mobile.data
      : userId.success
        ? `user:${userId.data}`
        : "invalid-input";
  await connectDB();
  const window = Math.floor(now / windowMs);
  const buckets = [
    { subject: `account:${account}`, limit: 5 },
    ...(ip !== "unknown" ? [{ subject: `ip:${ip}`, limit: 50 }] : []),
  ];
  for (const { subject, limit } of buckets) {
    const id = createHmac("sha256", getEnv().AUTH_SECRET)
      .update(`${scope}:${subject}:${window}`)
      .digest("hex");
    try {
      await AuthAttempt.findOneAndUpdate(
        { _id: id, count: { $lt: limit } },
        {
          $inc: { count: 1 },
          $setOnInsert: { expiresAt: new Date((window + 1) * windowMs) },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: false },
      ).lean();
    } catch (error: unknown) {
      // A full bucket cannot match the filter; its unique ID rejects the attempted upsert.
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
      )
        return false;
      throw error;
    }
  }
  return true;
}

export async function consumeOtpLimit(
  scope: "send" | "verify",
  mobile: string,
  ip: string,
  now = Date.now(),
) {
  await connectDB();
  // Expired windows reset atomically; resending never resets these buckets.
  for (const { subject, limit } of [
    { subject: `mobile:${mobile}`, limit: scope === "send" ? 10 : 30 },
    { subject: `ip:${ip}`, limit: scope === "send" ? 50 : 200 },
  ]) {
    const id = createHmac("sha256", getEnv().AUTH_SECRET)
      .update(`otp:${scope}:${subject}`)
      .digest("hex");
    await AuthAttempt.updateOne(
      { _id: id, expiresAt: { $lte: new Date(now) } },
      { $set: { count: 0, expiresAt: new Date(now + 3600000) } },
    );
    try {
      await AuthAttempt.findOneAndUpdate(
        { _id: id, count: { $lt: limit } },
        {
          $inc: { count: 1 },
          $setOnInsert: { expiresAt: new Date(now + 3600000) },
        },
        { upsert: true, setDefaultsOnInsert: false },
      ).lean();
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
      )
        return false;
      throw error;
    }
  }
  return true;
}

export async function consumeOtpCooldown(mobile: string, now = Date.now()) {
  await connectDB();
  const id = `otp-cooldown:${createHmac("sha256", getEnv().AUTH_SECRET).update(mobile).digest("hex")}`;
  await AuthAttempt.updateOne(
    { _id: id, expiresAt: { $lte: new Date(now) } },
    { $set: { count: 0, expiresAt: new Date(now + 60000) } },
  );
  try {
    await AuthAttempt.findOneAndUpdate(
      { _id: id, count: { $lt: 1 } },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date(now + 60000) },
      },
      { upsert: true, setDefaultsOnInsert: false },
    );
    return true;
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    )
      return false;
    throw error;
  }
}
