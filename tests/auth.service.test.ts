import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { hash } from "bcryptjs";
import { startTestMongo } from "./mongo-server";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectDB: async () => mongoose }));
import { authenticateUser } from "@/services/auth.service";
import { User } from "@/models/user";

let server: Awaited<ReturnType<typeof startTestMongo>>;
let passwordHash: string;
beforeAll(async () => {
  server = await startTestMongo();
  await mongoose.connect(server.uri, {
    dbName: "launchox_auth_test",
    bufferCommands: false,
  });
  await User.init();
  passwordHash = await hash("Customer123!", 12);
}, 180000);
beforeEach(async () => {
  await User.deleteMany({});
});
afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
});

it("authenticates a verified mobile using the existing account and exposes no hash", async () => {
  const user = await User.create({
    mobile: "09123456789",
    mobileVerifiedAt: new Date(),
    passwordHash,
  });
  const identity = await authenticateUser({
    mobile: "۰۹۱۲۳۴۵۶۷۸۹",
    password: "Customer123!",
  });
  expect(identity).toMatchObject({ id: String(user._id), role: "customer" });
  expect(identity).not.toHaveProperty("passwordHash");
  expect(await User.findById(user._id).lean()).not.toHaveProperty(
    "passwordHash",
  );
});
it("rejects wrong passwords, inactive, unverified and passwordless accounts", async () => {
  const user = await User.create({
    mobile: "09123456789",
    mobileVerifiedAt: new Date(),
    passwordHash,
  });
  expect(
    await authenticateUser({ mobile: user.mobile, password: "wrong" }),
  ).toBeNull();
  await User.updateOne({ _id: user._id }, { $set: { isActive: false } });
  expect(
    await authenticateUser({ mobile: user.mobile, password: "Customer123!" }),
  ).toBeNull();
  await User.updateOne(
    { _id: user._id },
    { $set: { isActive: true }, $unset: { passwordHash: 1 } },
  );
  expect(
    await authenticateUser({ mobile: user.mobile, password: "Customer123!" }),
  ).toBeNull();
  await User.updateOne(
    { _id: user._id },
    { $set: { passwordHash }, $unset: { mobileVerifiedAt: 1 } },
  );
  expect(
    await authenticateUser({ mobile: user.mobile, password: "Customer123!" }),
  ).toBeNull();
});
it("lets preassigned admins use their existing password while OTP enrollment remains pending", async () => {
  const admin = await User.create({
    mobile: "09123456789",
    email: "admin@example.com",
    role: "admin",
    passwordHash,
  });
  expect(
    await authenticateUser({ mobile: admin.mobile, password: "Customer123!" }),
  ).toMatchObject({ id: String(admin._id), role: "admin" });
  expect(
    await authenticateUser({ mobile: admin.mobile, password: "wrong" }),
  ).toBeNull();
  expect(
    await authenticateUser({ email: admin.email, password: "Customer123!" }),
  ).toBeNull();
  await User.updateOne({ _id: admin._id }, { $set: { isActive: false } });
  expect(
    await authenticateUser({ mobile: admin.mobile, password: "Customer123!" }),
  ).toBeNull();
});
it("allows minimal users and enforces mobile and nonempty email uniqueness", async () => {
  await User.create([
    { mobile: "09123456789" },
    { mobile: "09123456788" },
    { email: "" },
  ]);
  await User.collection.insertOne({ email: null });
  expect(await User.countDocuments()).toBe(4);
  await expect(User.create({ mobile: "09123456789" })).rejects.toMatchObject({
    code: 11000,
  });
  await User.create({ email: "same@example.com" });
  await expect(
    User.create({ email: "same@example.com" }),
  ).rejects.toMatchObject({ code: 11000 });
});
