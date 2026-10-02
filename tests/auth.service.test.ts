import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { compare } from "bcryptjs";
import { startTestMongo } from "./mongo-server";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectDB: async () => mongoose }));
import { authenticateUser, registerUser } from "@/services/auth.service";
import { User } from "@/models/user";

let server: Awaited<ReturnType<typeof startTestMongo>>;
const input = {
  name: "کاربر نمونه",
  email: "user@example.com",
  password: "Customer123!",
  confirmPassword: "Customer123!",
};
beforeAll(async () => {
  server = await startTestMongo();
  await mongoose.connect(server.uri, {
    dbName: "launchox_auth_test",
    bufferCommands: false,
  });
  await User.init();
}, 180000);
beforeEach(async () => {
  await User.deleteMany({});
});
afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
});

it("registers only customers, hashes passwords and returns safe plain identities", async () => {
  const inputWithExtraFields = {
    ...input,
    role: "admin",
    isActive: false,
  };
  const identity = await registerUser(inputWithExtraFields);
  expect(identity.role).toBe("customer");
  expect(Object.keys(identity).sort()).toEqual(["email", "id", "name", "role"]);
  const stored = await User.findById(identity.id)
    .select("+passwordHash")
    .lean()
    .orFail();
  expect(stored.isActive).toBe(true);
  expect(stored.passwordHash.startsWith("$2b$12$")).toBe(true);
  expect(await compare(input.password, stored.passwordHash)).toBe(true);
  expect(
    await authenticateUser({
      email: "USER@EXAMPLE.COM",
      password: input.password,
    }),
  ).toEqual(identity);
}, 20000);

it("rejects invalid, unknown, wrong-password and inactive logins without leaking account existence", async () => {
  expect(
    await authenticateUser({ email: "invalid", password: "wrong" }),
  ).toBeNull();
  expect(
    await authenticateUser({ ...input, email: "missing@example.com" }),
  ).toBeNull();
  const user = await registerUser(input);
  expect(
    await authenticateUser({ email: input.email, password: "wrong" }),
  ).toBeNull();
  await User.updateOne({ _id: user.id }, { $set: { isActive: false } });
  expect(await authenticateUser(input)).toBeNull();
}, 20000);

it("rejects duplicate registration without creating extra users", async () => {
  await registerUser(input);
  await expect(registerUser(input)).rejects.toMatchObject({
    code: "CONFLICT",
    message: "این ایمیل قبلاً ثبت شده است",
  });
  expect(await User.countDocuments()).toBe(1);
}, 20000);
