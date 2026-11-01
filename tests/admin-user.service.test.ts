import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { hash } from "bcryptjs";
import { startTestMongo } from "./mongo-server";
import { userInput } from "./fixtures";
// Real bcrypt checks and transaction retries need headroom on busy CI hosts.
vi.setConfig({ testTimeout: 30000 });
const guard = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ requireAdmin: guard }));
vi.mock("@/lib/db", () => ({ connectDB: async () => mongoose }));
import { User } from "@/models/user";
import { Counter } from "@/models/counter";
import { UserAccessAudit } from "@/models/user-access-audit";
import { AdminOwnership } from "@/models/admin-ownership";
import { OwnershipAudit } from "@/models/ownership-audit";
import { maintainOwner } from "@/services/owner-maintenance.service";
import {
  listUsersAdmin,
  setUserActive,
  setUserRole,
  getUserManagementPermissions,
} from "@/services/admin-user.service";

let server: Awaited<ReturnType<typeof startTestMongo>>;
let actorId: string;
let targetId: string;
let passwordHash: string;
const password = "OwnerTest-strong-2026!";
const operator = "security-test";
const reason = "Test authorized ownership recovery";
const role = (id: string, value: "admin" | "customer" = "admin") =>
  setUserRole({ id, role: value, confirmationPassword: password });
const active = (id: string, isActive: boolean) =>
  setUserActive({ id, isActive, confirmationPassword: password });
beforeAll(async () => {
  server = await startTestMongo(true);
  await mongoose.connect(server.uri, {
    dbName: "admin_security",
    bufferCommands: false,
  });
  await Promise.all([
    User.init(),
    Counter.init(),
    UserAccessAudit.init(),
    AdminOwnership.init(),
    OwnershipAudit.init(),
  ]);
  passwordHash = await hash(password, 12);
}, 180000);
beforeEach(async () => {
  vi.restoreAllMocks();
  guard.mockReset();
  await Promise.all([
    User.deleteMany({}),
    Counter.deleteMany({}),
    UserAccessAudit.deleteMany({}),
    AdminOwnership.deleteMany({}),
    OwnershipAudit.deleteMany({}),
  ]);
  const actor = await User.create({
    ...userInput,
    passwordHash,
    role: "admin",
  });
  const target = await User.create({
    ...userInput,
    email: "target@example.com",
    passwordHash,
  });
  actorId = String(actor._id);
  targetId = String(target._id);
  await AdminOwnership.create({ _id: "store-owner", owner: actor._id });
  guard.mockResolvedValue({ id: actorId });
});
afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
});

it("guards every panel entry before using invalid input", async () => {
  guard.mockRejectedValue(new Error("denied"));
  for (const call of [
    () => listUsersAdmin(),
    () => getUserManagementPermissions(),
    () => setUserRole({}),
    () => setUserActive({}),
  ])
    await expect(call()).rejects.toThrow("denied");
});
it("rejects invalid IDs, missing fields, invalid roles and oversized passwords", async () => {
  for (const input of [
    { id: "bad", role: "admin" },
    { id: targetId, role: "owner" },
    { id: targetId },
    { id: targetId, role: "admin", confirmationPassword: "a".repeat(73) },
    { id: targetId, role: "admin", confirmationPassword: "\u0622".repeat(37) },
  ])
    await expect(setUserRole(input)).rejects.toThrow();
  await expect(
    setUserActive({ id: targetId, isActive: "bad" }),
  ).rejects.toThrow();
  await expect(
    role(new mongoose.Types.ObjectId().toString()),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  expect(await UserAccessAudit.countDocuments()).toBe(0);
});
it("fails closed for role changes without configured ownership, while allowing customer activity", async () => {
  await AdminOwnership.deleteMany({});
  await expect(role(targetId)).rejects.toMatchObject({ code: "FORBIDDEN" });
  await setUserActive({ id: targetId, isActive: false });
  expect(await getUserManagementPermissions()).toEqual({
    canManageAdmins: false,
    ownerId: null,
  });
});
it("limits ordinary admins to customers even with legacy flags, forged owner fields and a valid password", async () => {
  await User.updateOne({ _id: targetId }, { $set: { role: "admin" } });
  await User.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(targetId) },
    { $set: { canManageAdmins: true } },
  );
  guard.mockResolvedValue({ id: targetId });
  await expect(
    setUserRole({
      id: actorId,
      role: "customer",
      ownerId: targetId,
      canManageAdmins: true,
      confirmationPassword: password,
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  const customer = await User.create({
    ...userInput,
    email: "customer@example.com",
  });
  await expect(role(String(customer._id))).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
  await expect(active(targetId, false)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
  await setUserActive({
    id: String(customer._id),
    isActive: false,
    role: "admin",
    ownerId: targetId,
  });
  expect((await User.findById(customer._id).lean())?.role).toBe("customer");
  expect(await getUserManagementPermissions()).toEqual({
    canManageAdmins: false,
    ownerId: actorId,
  });
});
it("rechecks the actor database role/activity after a stale guard", async () => {
  for (const change of [
    { role: "customer", isActive: true },
    { role: "admin", isActive: false },
  ]) {
    await User.updateOne({ _id: actorId }, { $set: change });
    await expect(active(targetId, false)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  }
  expect(await UserAccessAudit.countDocuments()).toBe(0);
});
it("protects owner role/activity including uppercase IDs regardless of additional admins", async () => {
  for (const id of [actorId, actorId.toUpperCase()]) {
    await expect(role(id, "customer")).rejects.toMatchObject({
      code: "CONFLICT",
    });
    await expect(active(id, false)).rejects.toMatchObject({ code: "CONFLICT" });
  }
  await role(targetId);
  await expect(active(actorId, false)).rejects.toMatchObject({
    code: "CONFLICT",
  });
  expect((await User.findById(actorId).lean())?.isActive).toBe(true);
});
it("requires the current owner's password for role and admin activity changes", async () => {
  for (const confirmationPassword of [undefined, "", "wrong"]) {
    await expect(
      setUserRole({ id: targetId, role: "admin", confirmationPassword }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  }
  expect((await User.findById(targetId).lean())?.role).toBe("customer");
  await role(targetId);
  await expect(
    setUserActive({ id: targetId, isActive: false }),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await active(targetId, false);
  await active(targetId, true);
  expect(await UserAccessAudit.countDocuments()).toBe(3);
});
it("persists five failed attempts across concurrent requests and blocks correct passwords until expiry", async () => {
  const attempts = await Promise.allSettled(
    Array.from({ length: 6 }, () =>
      setUserRole({
        id: targetId,
        role: "admin",
        confirmationPassword: "wrong",
      }),
    ),
  );
  expect(attempts.every((result) => result.status === "rejected")).toBe(true);
  const state = await AdminOwnership.findById("store-owner").lean().orFail();
  expect(state.failedAttempts).toBe(5);
  expect(state.blockedUntil.getTime()).toBeGreaterThan(Date.now());
  await expect(role(targetId)).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(await UserAccessAudit.countDocuments()).toBe(0);
  await AdminOwnership.updateOne(
    { _id: state._id },
    { $set: { blockedUntil: new Date(Date.now() - 1000) } },
  );
  await role(targetId);
  expect(
    (await AdminOwnership.findById(state._id).lean())?.failedAttempts,
  ).toBe(0);
});
it("preserves unrelated fields and records only safe before/after states", async () => {
  const before = await User.findById(targetId)
    .select("+passwordHash")
    .lean()
    .orFail();
  await setUserRole({
    id: targetId,
    role: "admin",
    confirmationPassword: password,
    isActive: false,
    passwordHash: "injected",
    actorId: targetId,
    owner: targetId,
  });
  await active(targetId, false);
  const after = await User.findById(targetId)
    .select("+passwordHash")
    .lean()
    .orFail();
  expect(after).toMatchObject({
    role: "admin",
    isActive: false,
    passwordHash: before.passwordHash,
    addresses: before.addresses,
  });
  const audits = await UserAccessAudit.find()
    .sort({ createdAt: 1, _id: 1 })
    .lean();
  expect(audits).toHaveLength(2);
  expect(String(audits[0].actor)).toBe(actorId);
  expect(String(audits[0].target)).toBe(targetId);
  expect(audits[0]).toMatchObject({
    actorEmail: userInput.email,
    before: { role: "customer", isActive: true },
    after: { role: "admin", isActive: true },
  });
  expect(audits[0].createdAt).toBeInstanceOf(Date);
  expect(JSON.stringify(audits)).not.toContain(password);
  for (const user of await listUsersAdmin())
    expect(Object.keys(user).sort()).toEqual([
      "email",
      "id",
      "isActive",
      "name",
      "role",
    ]);
});
it("rolls back the user update when audit persistence fails", async () => {
  vi.spyOn(UserAccessAudit, "create").mockRejectedValueOnce(
    new Error("audit unavailable"),
  );
  await expect(role(targetId)).rejects.toThrow("audit unavailable");
  expect((await User.findById(targetId).lean())?.role).toBe("customer");
});
it("serializes duplicate promotions and writes one audit", async () => {
  const results = await Promise.all(
    Array.from({ length: 3 }, () => role(targetId)),
  );
  expect(results.every((result) => result.id === targetId)).toBe(true);
  expect(await UserAccessAudit.countDocuments()).toBe(1);
});
it("keeps owner identity through email changes", async () => {
  await User.updateOne(
    { _id: actorId },
    { $set: { email: "renamed@example.com" } },
  );
  expect((await getUserManagementPermissions()).canManageAdmins).toBe(true);
  await role(targetId);
});
it("rejects duplicate bootstrap and wrong expected-owner transfers", async () => {
  await expect(
    maintainOwner({ operation: "bootstrap", targetId, operator, reason }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await expect(
    maintainOwner({
      operation: "transfer",
      targetId,
      expectedOwnerId: targetId,
      operator,
      reason,
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect(await OwnershipAudit.countDocuments()).toBe(0);
});
it("transfers ownership atomically, promotes the target, records operator and revokes the old owner's authority", async () => {
  await maintainOwner({
    operation: "transfer",
    targetId,
    expectedOwnerId: actorId,
    operator,
    reason,
  });
  expect(
    String((await AdminOwnership.findById("store-owner").lean())?.owner),
  ).toBe(targetId);
  expect((await User.findById(targetId).lean())?.role).toBe("admin");
  const audit = await OwnershipAudit.findOne().lean().orFail();
  expect(audit).toMatchObject({ operator, reason, previousRole: "customer" });
  expect(String(audit.previousOwner)).toBe(actorId);
  await expect(role(actorId)).rejects.toMatchObject({ code: "FORBIDDEN" });
  guard.mockResolvedValue({ id: targetId });
  await active(actorId, false);
});
it("serializes competing transfers so exactly one expected-owner operation wins", async () => {
  const third = await User.create({ ...userInput, email: "third@example.com" });
  const results = await Promise.allSettled(
    [targetId, String(third._id)].map((id) =>
      maintainOwner({
        operation: "transfer",
        targetId: id,
        expectedOwnerId: actorId,
        operator,
        reason,
      }),
    ),
  );
  expect(
    results.filter((result) => result.status === "fulfilled"),
  ).toHaveLength(1);
  expect(await AdminOwnership.countDocuments()).toBe(1);
  expect(await OwnershipAudit.countDocuments()).toBe(1);
});
it("serializes transfer against old-owner actions without allowing a stale owner to act afterward", async () => {
  await Promise.allSettled([
    maintainOwner({
      operation: "transfer",
      targetId,
      expectedOwnerId: actorId,
      operator,
      reason,
    }),
    role(targetId),
  ]);
  expect(
    String((await AdminOwnership.findById("store-owner").lean())?.owner),
  ).toBe(targetId);
  await expect(role(targetId)).rejects.toMatchObject({ code: "CONFLICT" });
  expect((await User.findById(targetId).lean())?.isActive).toBe(true);
});
it("rolls back ownership and promotion if maintenance auditing fails", async () => {
  vi.spyOn(OwnershipAudit, "create").mockRejectedValueOnce(
    new Error("audit unavailable"),
  );
  await expect(
    maintainOwner({
      operation: "transfer",
      targetId,
      expectedOwnerId: actorId,
      operator,
      reason,
    }),
  ).rejects.toThrow("audit unavailable");
  expect(
    String((await AdminOwnership.findById("store-owner").lean())?.owner),
  ).toBe(actorId);
  expect((await User.findById(targetId).lean())?.role).toBe("customer");
});
it("creates a separate owner account and refuses a second owner or duplicate email", async () => {
  await AdminOwnership.deleteMany({});
  const input = {
    operation: "create",
    email: "owner@example.com",
    password,
    operator,
    reason,
  };
  const result = await maintainOwner(input);
  expect((await User.findById(result.ownerId).lean())?.role).toBe("admin");
  await expect(
    maintainOwner({ ...input, email: "second@example.com" }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await expect(
    maintainOwner({ ...input, expectedOwnerId: result.ownerId }),
  ).rejects.toThrow();
  expect(await AdminOwnership.countDocuments()).toBe(1);
  expect(await User.countDocuments({ email: "second@example.com" })).toBe(0);
});
it("rolls back new account creation on audit failure", async () => {
  await AdminOwnership.deleteMany({});
  vi.spyOn(OwnershipAudit, "create").mockRejectedValueOnce(
    new Error("audit unavailable"),
  );
  await expect(
    maintainOwner({
      operation: "create",
      email: "owner@example.com",
      password,
      operator,
      reason,
    }),
  ).rejects.toThrow("audit unavailable");
  expect(await User.countDocuments({ email: "owner@example.com" })).toBe(0);
  expect(await AdminOwnership.countDocuments()).toBe(0);
});
