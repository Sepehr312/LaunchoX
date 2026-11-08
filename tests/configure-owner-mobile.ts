import { getEnv } from "@/lib/env";
import { connectDB } from "@/lib/db";
import { AdminOwnership } from "@/models/admin-ownership";
import { User } from "@/models/user";
import { configureOwnerMobile } from "@/services/admin-mobile.service";
import { loginMobileSchema } from "@/validations/otp";
import { objectIdSchema } from "@/validations/common";
import { compare } from "bcryptjs";

let stage = "configuration";
async function main() {
  const env = getEnv();
  const uri = new URL(env.MONGODB_URI);
  stage = "local-target-check";
  if (
    uri.protocol !== "mongodb:" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(uri.hostname)
  )
    throw new Error("Local MongoDB is required");
  const args = process.argv.slice(2);
  const argument = (name: string) => args[args.indexOf(name) + 1];
  stage = "local-database-connection";
  const db = await connectDB();
  try {
    stage = "owner-read";
    const ownership = await AdminOwnership.findById("store-owner").lean();
    const user = ownership ? await User.findById(ownership.owner).lean() : null;
    console.log(
      JSON.stringify({
        database: db.connection.name,
        host: db.connection.host,
        ownerId: user ? String(user._id) : null,
        activeAdmin: user?.isActive && user.role === "admin",
        mobilePresent: Boolean(user?.mobile),
        mobileVerified: Boolean(user?.mobileVerifiedAt),
        mode: args.includes("--apply") ? "apply" : "preview",
      }),
    );
    if (args.includes("--verify")) {
      if (!user || !env.OWNER_NEW_PASSWORD || !args.includes("--mobile"))
        throw new Error("Private verification inputs are required");
      const stored = await User.findById(user._id)
        .select("+passwordHash")
        .lean();
      const passwordMatches = Boolean(
        stored?.passwordHash &&
        (await compare(env.OWNER_NEW_PASSWORD, stored.passwordHash)),
      );
      const mobileMatches =
        stored?.mobile === loginMobileSchema.parse(argument("--mobile"));
      console.log(
        JSON.stringify({
          passwordMatches,
          mobileMatches,
          bcrypt12: stored?.passwordHash?.startsWith("$2b$12$") ?? false,
          previousSessionsRevoked: (stored?.sessionVersion ?? 0) > 0,
        }),
      );
      if (!passwordMatches || !mobileMatches)
        throw new Error("Owner verification failed");
      return;
    }
    if (!args.includes("--apply")) return;
    if (
      !args.includes("--owner-id") ||
      !args.includes("--mobile") ||
      !args.includes("--expected-db") ||
      argument("--expected-db") !== db.connection.name ||
      !env.OWNER_NEW_PASSWORD
    )
      throw new Error(
        "Expected database, owner, mobile and private password are required",
      );
    stage = "owner-update";
    await configureOwnerMobile({
      expectedOwnerId: objectIdSchema.parse(argument("--owner-id")),
      mobile: loginMobileSchema.parse(argument("--mobile")),
      password: env.OWNER_NEW_PASSWORD,
    });
    console.log(
      "Owner mobile and bcrypt-12 password updated; previous sessions revoked; mobile verification was not fabricated.",
    );
  } finally {
    await db.disconnect();
  }
}
main().catch(() => {
  console.error(
    `Owner mobile maintenance failed at ${stage}; no credentials were logged. Check local target, owner, unique mobile and replica-set configuration.`,
  );
  process.exitCode = 1;
});
