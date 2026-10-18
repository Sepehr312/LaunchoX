import { beforeEach, expect, it, vi } from "vitest";
const guard = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ requireAdmin: guard }));
import { fixture } from "./order-fixture";
import { userInput } from "./fixtures";
import { User } from "@/models/user";
import {
  listUsersAdmin,
  setUserActive,
  setUserRole,
} from "@/services/admin-user.service";
beforeEach(() => {
  guard.mockReset();
  guard.mockResolvedValue({ id: fixture.user });
});
it("guards both reads and writes before touching data", async () => {
  guard.mockRejectedValue(new Error("denied"));
  await expect(listUsersAdmin()).rejects.toThrow("denied");
  await expect(
    setUserActive({ id: fixture.user, isActive: false }),
  ).rejects.toThrow("denied");
  await expect(
    setUserRole({ id: fixture.other, role: "admin" }),
  ).rejects.toThrow("denied");
  expect((await User.findById(fixture.user).lean())?.isActive).toBe(true);
});

it("keeps older administrators ahead of newer customers", async () => {
  const admin = await User.create({
    ...userInput,
    email: "old-admin@example.com",
    role: "admin",
  });
  await User.collection.updateOne(
    { _id: admin._id },
    { $set: { createdAt: new Date("2020-01-01") } },
  );
  await User.create({ ...userInput, email: "new-customer@example.com" });
  const users = await listUsersAdmin();
  expect(users[0].id).toBe(String(admin._id));
  expect(users.slice(1).every((user) => user.role === "customer")).toBe(true);
});

it("changes only the target role and reorders promotions above customers", async () => {
  const target = await User.create({
    ...userInput,
    email: "role-target@example.com",
    isActive: false,
  });
  const id = String(target._id);
  const before = await User.findById(id)
    .select("+passwordHash")
    .lean()
    .orFail();
  for (const role of ["admin", "customer"] as const) {
    expect(
      await setUserRole({
        id,
        role,
        isActive: true,
        passwordHash: "injected",
        actorId: id,
      }),
    ).toEqual({ id });
    const after = await User.findById(id)
      .select("+passwordHash")
      .lean()
      .orFail();
    expect(after.role).toBe(role);
    expect(after.isActive).toBe(before.isActive);
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(after.addresses).toEqual(before.addresses);
    if (role === "admin") expect((await listUsersAdmin())[0].id).toBe(id);
  }
});

it("rejects self-role changes, invalid roles and missing targets", async () => {
  for (const id of [fixture.user, fixture.user.toUpperCase()])
    await expect(setUserRole({ id, role: "customer" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  for (const input of [
    { id: "bad", role: "admin" },
    { id: fixture.other, role: "owner" },
    { id: fixture.other },
  ])
    await expect(setUserRole(input)).rejects.toThrow();
  await expect(
    setUserRole({ id: fixture.other, role: "admin" }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});
it("lists active and inactive users with minimal safe DTOs", async () => {
  await User.create({
    ...userInput,
    email: "inactive@example.com",
    isActive: false,
    role: "admin",
  });
  const users = await listUsersAdmin();
  expect(users).toHaveLength(2);
  expect(users[0]).toMatchObject({
    email: "inactive@example.com",
    role: "admin",
    isActive: false,
  });
  for (const user of users) {
    expect(Object.keys(user).sort()).toEqual([
      "email",
      "id",
      "isActive",
      "name",
      "role",
    ]);
    expect(typeof user.id).toBe("string");
  }
});
it("rejects self-deactivation including uppercase ObjectIds", async () => {
  for (const id of [fixture.user, fixture.user.toUpperCase()])
    await expect(setUserActive({ id, isActive: false })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  expect((await User.findById(fixture.user).lean())?.isActive).toBe(true);
});
it("persists disable and enable without changing roles, passwords or addresses", async () => {
  const other = await User.create({
    ...userInput,
    email: "other@example.com",
    role: "admin",
  });
  const before = await User.findById(other._id).select("+passwordHash").lean();
  const id = String(other._id);
  for (const isActive of [false, true]) {
    expect(
      await setUserActive({ id, isActive, role: "customer", actorId: id }),
    ).toEqual({ id });
    const after = await User.findById(id).select("+passwordHash").lean();
    expect(after?.isActive).toBe(isActive);
    expect(after?.role).toBe(before?.role);
    expect(after?.passwordHash).toBe(before?.passwordHash);
    expect(after?.addresses).toEqual(before?.addresses);
  }
});
it("rejects invalid values and missing users", async () => {
  await expect(setUserActive({ id: "bad", isActive: false })).rejects.toThrow();
  await expect(
    setUserActive({ id: fixture.other, isActive: "bad" }),
  ).rejects.toThrow();
  await expect(
    setUserActive({ id: fixture.other, isActive: false }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});
