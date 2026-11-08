import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { compare, hash } from "bcryptjs";
import { startTestMongo } from "./mongo-server";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectDB: async () => mongoose }));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    AUTH_SECRET: "test-otp-secret-with-at-least-32-characters",
  }),
}));
vi.mock("@/services/sms-ir.service", () => ({ sendOtpSms: vi.fn() }));
import { sendOtpSms } from "@/services/sms-ir.service";
import {
  requestOtp,
  authenticateOtp,
  reserveOtp,
  discardInitialPasswordGrant,
} from "@/services/otp.service";
import {
  setInitialPassword,
  setPasswordWithOtp,
  changeMobileWithOtp,
} from "@/services/credential-security.service";
import { loginMobileSchema, otpCodeSchema } from "@/validations/otp";
import { User } from "@/models/user";
import { OtpChallenge } from "@/models/otp-challenge";
import { OtpGrant } from "@/models/otp-grant";
import { AuthAttempt } from "@/models/auth-attempt";
import { AdminOwnership } from "@/models/admin-ownership";
import { consumeOtpLimit } from "@/services/auth-attempt.service";
import {
  requestAdminEnrollment,
  finishAdminEnrollment,
  configureOwnerMobile,
} from "@/services/admin-mobile.service";

let server: Awaited<ReturnType<typeof startTestMongo>>;
let adminHash: string;
const mobile = "09123456789";
const ip = "127.0.0.1";
const password = { password: "Customer123!", confirmPassword: "Customer123!" };
async function releaseCooldown() {
  await AuthAttempt.updateMany(
    { _id: /^otp-cooldown:/ },
    { $set: { expiresAt: new Date(0) } },
  );
}
async function issue(
  purpose: "login" | "set-password" | "recovery" | "change-mobile" = "login",
  actor?: { id: string; sessionVersion: number },
  number = mobile,
) {
  const challenge = await requestOtp({ mobile: number, purpose }, ip, actor);
  const call = vi.mocked(sendOtpSms).mock.calls.at(-1);
  if (!call) throw new Error("Expected mock provider call");
  return {
    mobile: number,
    purpose,
    challengeId: challenge.challengeId,
    code: call[1],
  };
}
beforeAll(async () => {
  server = await startTestMongo(true);
  await mongoose.connect(server.uri, {
    dbName: "launchox_otp_test",
    bufferCommands: false,
  });
  await Promise.all([
    User.init(),
    OtpChallenge.init(),
    OtpGrant.init(),
    AuthAttempt.init(),
  ]);
  adminHash = await hash("AdminTest123!", 12);
}, 180000);
beforeEach(async () => {
  vi.mocked(sendOtpSms).mockReset().mockResolvedValue(undefined);
  await Promise.all([
    User.deleteMany({}),
    OtpChallenge.deleteMany({}),
    OtpGrant.deleteMany({}),
    AuthAttempt.deleteMany({}),
    AdminOwnership.deleteMany({}),
  ]);
});
afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
});

it.each(["۰۹۱۲۳۴۵۶۷۸۹", "٠٩١٢٣٤٥٦٧٨٩", mobile])(
  "normalizes supported mobile format %s",
  (value) => {
    expect(loginMobileSchema.parse(value)).toBe(mobile);
    expect(otpCodeSchema.parse("۱۲۳۴۵۶")).toBe("123456");
  },
);
it.each([
  "9123456789",
  "0912 345 6789",
  "+989123456789",
  "00989123456789",
  "+9809123456789",
  "",
  "091234567890",
  "0912345678a",
])("rejects ambiguous mobile %s", (value) => {
  expect(loginMobileSchema.safeParse(value).success).toBe(false);
});
it("creates no user during send, stores no raw code, then creates only a customer", async () => {
  const ticket = await issue();
  expect(await User.countDocuments()).toBe(0);
  const stored = await OtpChallenge.findOne().select("+digest").lean();
  expect(JSON.stringify(stored)).not.toContain(ticket.code);
  const user = await authenticateOtp({ ...ticket, role: "admin" }, ip);
  expect(user.role).toBe("customer");
  expect(user.initialPasswordGrant).toMatch(/^[a-f0-9]{64}$/);
  const account = await User.findById(user.id).select("+passwordHash").lean();
  expect(account).toMatchObject({ mobile });
  for (const field of ["passwordHash", "email", "name"])
    expect(account).not.toHaveProperty(field);
  expect(account?.mobileVerifiedAt).toBeInstanceOf(Date);
  await expect(authenticateOtp(ticket, ip)).rejects.toThrow();
});
it("logs into an existing verified account without onboarding or changing its role", async () => {
  const existing = await User.create({
    mobile,
    mobileVerifiedAt: new Date(),
    role: "admin",
  });
  const result = await authenticateOtp(await issue(), ip);
  expect(result).toMatchObject({
    id: String(existing._id),
    role: "admin",
    initialPasswordGrant: undefined,
  });
  expect(await User.countDocuments()).toBe(1);
});
it.each([
  { role: "admin" as const, isActive: true },
  { role: "customer" as const, isActive: true },
  { role: "customer" as const, isActive: false, mobileVerifiedAt: new Date() },
])("rejects inactive or unverified historical accounts %s", async (fields) => {
  await User.create({ mobile, ...fields });
  await expect(authenticateOtp(await issue(), ip)).rejects.toThrow();
  expect(await User.countDocuments()).toBe(1);
});
it("reserves at most five attempts under parallel wrong codes", async () => {
  const ticket = await issue();
  const results = await Promise.allSettled(
    Array.from({ length: 12 }, () =>
      authenticateOtp({ ...ticket, code: "000000" }, ip),
    ),
  );
  expect(results.every((result) => result.status === "rejected")).toBe(true);
  expect((await OtpChallenge.findOne().lean())?.attempts).toBe(5);
  await expect(authenticateOtp(ticket, ip)).rejects.toThrow();
});
it("accepts delayed codes after two minutes and rejects them after five minutes", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  try {
    const start = Date.now();
    const valid = await issue();
    const expired = await issue("login", undefined, "09123456788");
    vi.setSystemTime(start + 121_000);
    await expect(authenticateOtp(valid, ip)).resolves.toBeDefined();
    vi.setSystemTime(start + 301_000);
    await expect(authenticateOtp(expired, ip)).rejects.toThrow();
  } finally {
    vi.useRealTimers();
  }
});
it("enforces expiry on every verification without relying on TTL", async () => {
  const ticket = await issue();
  await OtpChallenge.updateOne(
    {},
    { $set: { expiresAt: new Date(Date.now() - 1) } },
  );
  await expect(authenticateOtp(ticket, ip)).rejects.toThrow();
});
it("consumes a code exactly once and creates one account under parallel verification", async () => {
  const ticket = await issue();
  const results = await Promise.allSettled(
    Array.from({ length: 4 }, () => authenticateOtp(ticket, ip)),
  );
  expect(
    results.filter((result) => result.status === "fulfilled"),
  ).toHaveLength(1);
  expect(await User.countDocuments()).toBe(1);
});
it("enforces resend cooldown atomically and invalidates the previous challenge", async () => {
  const first = await issue();
  await expect(issue()).rejects.toThrow();
  await OtpChallenge.updateOne({}, { $set: { nextSendAt: new Date(0) } });
  await releaseCooldown();
  const sends = await Promise.allSettled([issue(), issue(), issue()]);
  expect(sends.filter((result) => result.status === "fulfilled")).toHaveLength(
    1,
  );
  await expect(authenticateOtp(first, ip)).rejects.toThrow();
});
it("never activates uncertain or failed deliveries", async () => {
  vi.mocked(sendOtpSms).mockRejectedValue(new Error("mock timeout"));
  await expect(issue()).rejects.toThrow();
  expect((await OtpChallenge.findOne().lean())?.state).toBe("failed");
  expect(await User.countDocuments()).toBe(0);
});
it("keeps verification limits across resend and purpose changes", async () => {
  const ticket = await issue();
  for (let i = 0; i < 30; i++)
    await reserveOtp({ ...ticket, code: "000000" }, ip).catch(() => undefined);
  await OtpChallenge.updateOne({}, { $set: { nextSendAt: new Date(0) } });
  await releaseCooldown();
  const next = await issue();
  await expect(authenticateOtp(next, ip)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
  await releaseCooldown();
  const recovery = await issue("recovery");
  await expect(reserveOtp(recovery, ip)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});
it("cannot use login codes for recovery or password setting", async () => {
  const ticket = await issue();
  await expect(
    setPasswordWithOtp({ ...ticket, purpose: "recovery", ...password }, ip),
  ).rejects.toThrow();
  expect(await User.countDocuments()).toBe(0);
});
it("binds initial password permission to one user, purpose, version and lifetime", async () => {
  const user = await authenticateOtp(await issue(), ip);
  const actor = { id: user.id, sessionVersion: user.sessionVersion };
  const stranger = await User.create({ mobile: "09123456788" });
  await expect(
    setInitialPassword(password, user.initialPasswordGrant, {
      id: String(stranger._id),
    }),
  ).rejects.toThrow();
  await expect(
    setInitialPassword(password, "0".repeat(64), actor),
  ).rejects.toThrow();
  await setInitialPassword(password, user.initialPasswordGrant, actor);
  const stored = await User.findById(user.id).select("+passwordHash").lean();
  expect(await compare(password.password, stored?.passwordHash ?? "")).toBe(
    true,
  );
  expect(stored?.sessionVersion).toBe(1);
  await expect(
    setInitialPassword(password, user.initialPasswordGrant, actor),
  ).rejects.toThrow();
}, 20000);
it("allows skipping the initial password and expires the grant without changing the account", async () => {
  const user = await authenticateOtp(await issue(), ip);
  await discardInitialPasswordGrant(user.initialPasswordGrant, user);
  await expect(
    setInitialPassword(password, user.initialPasswordGrant, user),
  ).rejects.toThrow();
  expect(
    (await User.findById(user.id).select("+passwordHash").lean())?.passwordHash,
  ).toBeUndefined();
});
it("requires a fresh purpose-bound OTP for later setting and recovery and revokes old sessions", async () => {
  const user = await authenticateOtp(await issue(), ip);
  await releaseCooldown();
  const set = await issue("set-password", user);
  await setPasswordWithOtp({ ...set, ...password }, ip, user);
  expect((await User.findById(user.id).lean())?.sessionVersion).toBe(1);
  await releaseCooldown();
  const recovery = await issue("recovery");
  await setPasswordWithOtp({ ...recovery, ...password }, ip);
  expect((await User.findById(user.id).lean())?.sessionVersion).toBe(2);
}, 20000);
it("requires proof of both old and new numbers for mobile changes", async () => {
  const user = await authenticateOtp(await issue(), ip);
  await releaseCooldown();
  const current = await issue("change-mobile", user);
  const next = await issue("change-mobile", user, "09123456788");
  await expect(
    changeMobileWithOtp(
      { current, next: { ...next, code: "000000" } },
      ip,
      user,
    ),
  ).rejects.toThrow();
  await changeMobileWithOtp({ current, next }, ip, user);
  expect(await User.findById(user.id).lean()).toMatchObject({
    mobile: "09123456788",
    sessionVersion: 1,
    role: "customer",
  });
});

it("enforces shared hourly mobile and IP budgets atomically", async () => {
  const now = Date.now();
  const results = await Promise.all(
    Array.from({ length: 15 }, () => consumeOtpLimit("send", mobile, ip, now)),
  );
  expect(results.filter(Boolean)).toHaveLength(10);
  expect(await consumeOtpLimit("send", mobile, "127.0.0.2", now + 1)).toBe(
    false,
  );
  expect(await consumeOtpLimit("send", mobile, ip, now + 3600000)).toBe(true);
  await AuthAttempt.deleteMany({});
  for (let index = 0; index < 50; index++)
    expect(
      await consumeOtpLimit(
        "send",
        `0912${String(index).padStart(7, "0")}`,
        ip,
        now,
      ),
    ).toBe(true);
  expect(await consumeOtpLimit("send", "09999999999", ip, now)).toBe(false);
  // This scenario exercises hundreds of real database operations, including concurrent writes.
}, 15_000);

it("rejects expired initial authorization even while TTL cleanup has not run", async () => {
  const user = await authenticateOtp(await issue(), ip);
  await OtpGrant.updateOne(
    {},
    { $set: { expiresAt: new Date(Date.now() - 1) } },
  );
  await expect(
    setInitialPassword(password, user.initialPasswordGrant, user),
  ).rejects.toThrow();
  expect(
    (await User.findById(user.id).select("+passwordHash").lean())?.passwordHash,
  ).toBeUndefined();
});

it("does not let initial password permission or old sessions replace an existing password", async () => {
  const user = await authenticateOtp(await issue(), ip);
  await User.updateOne({ _id: user.id }, { $set: { passwordHash: adminHash } });
  await expect(
    setInitialPassword(password, user.initialPasswordGrant, user),
  ).rejects.toThrow();
  await releaseCooldown();
  const fresh = await issue("set-password", user);
  await expect(
    setPasswordWithOtp({ ...fresh, ...password }, ip, user),
  ).rejects.toThrow();
  expect(
    (await User.findById(user.id).select("+passwordHash").lean())?.passwordHash,
  ).toBe(adminHash);
});

it("only enrolls a pre-existing admin after current password and purpose-bound OTP proof", async () => {
  const admin = await User.create({
    role: "admin",
    email: "admin@example.com",
    passwordHash: adminHash,
  });
  const actor = { id: String(admin._id), sessionVersion: 0 };
  const input = { mobile, confirmationPassword: "AdminTest123!" };
  await expect(
    requestAdminEnrollment(
      { ...input, confirmationPassword: "wrong" },
      actor,
      ip,
    ),
  ).rejects.toThrow();
  expect(sendOtpSms).not.toHaveBeenCalled();
  const challenge = await requestAdminEnrollment(input, actor, ip);
  const code = vi.mocked(sendOtpSms).mock.calls.at(-1)?.[1];
  await finishAdminEnrollment(
    {
      ...input,
      challengeId: challenge.challengeId,
      code,
      purpose: "admin-enrollment",
    },
    actor,
    ip,
  );
  const updated = await User.findById(actor.id).lean();
  expect(updated).toMatchObject({
    mobile,
    role: "admin",
    isActive: true,
    sessionVersion: 1,
  });
  expect(updated?.mobileVerifiedAt).toBeInstanceOf(Date);
  await expect(
    finishAdminEnrollment(
      {
        ...input,
        challengeId: challenge.challengeId,
        code,
        purpose: "admin-enrollment",
      },
      actor,
      ip,
    ),
  ).rejects.toThrow();
}, 20000);

it("prevents customers and login challenges from enrolling an admin", async () => {
  const customer = await User.create({ passwordHash: adminHash });
  const actor = { id: String(customer._id), sessionVersion: 0 };
  await expect(
    requestAdminEnrollment(
      { mobile, confirmationPassword: "AdminTest123!" },
      actor,
      ip,
    ),
  ).rejects.toThrow();
  expect(sendOtpSms).not.toHaveBeenCalled();
  await expect(
    requestOtp({ mobile, purpose: "admin-enrollment" }, ip, actor),
  ).rejects.toThrow();
});

it("limits operator maintenance to the exact active owner and leaves the mobile unverified", async () => {
  const owner = await User.create({
    role: "admin",
    email: "owner@example.com",
    passwordHash: adminHash,
  });
  const other = await User.create({
    role: "admin",
    email: "other@example.com",
    passwordHash: adminHash,
  });
  await AdminOwnership.create({ _id: "store-owner", owner: owner._id });
  await expect(
    configureOwnerMobile({
      expectedOwnerId: String(other._id),
      mobile,
      password: password.password,
    }),
  ).rejects.toThrow();
  await configureOwnerMobile({
    expectedOwnerId: String(owner._id),
    mobile,
    password: password.password,
  });
  const updated = await User.findById(owner._id).select("+passwordHash").lean();
  expect(updated).toMatchObject({
    role: "admin",
    isActive: true,
    mobile,
    sessionVersion: 1,
  });
  expect(updated?.mobileVerifiedAt).toBeUndefined();
  expect(await compare(password.password, updated?.passwordHash ?? "")).toBe(
    true,
  );
  expect((await User.findById(other._id).lean())?.mobile).toBeUndefined();
}, 20000);

it("cannot bypass the mobile cooldown by switching purpose or form", async () => {
  await issue();
  await expect(issue("recovery")).rejects.toMatchObject({ code: "FORBIDDEN" });
  const user = await User.create({ mobile, mobileVerifiedAt: new Date() });
  await expect(
    issue("set-password", { id: String(user._id), sessionVersion: 0 }),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(sendOtpSms).toHaveBeenCalledOnce();
});
