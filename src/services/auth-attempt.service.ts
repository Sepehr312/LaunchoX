import "server-only";
import { createHmac } from "node:crypto";
import { connectDB } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { AuthAttempt } from "@/models/auth-attempt";
import { emailSchema } from "@/validations/common";

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
  const account = parsed.success ? parsed.data : "invalid-input";
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
