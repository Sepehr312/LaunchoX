import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { hash } from "bcryptjs";
import { startTestMongo } from "./mongo-server";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ auth: vi.fn(), profile: vi.fn() }));
vi.mock("next-auth", async () => {
  const { CredentialsSignin } = await import("@auth/core/errors");
  return { CredentialsSignin, default: () => ({ auth: mocks.auth }) };
});
vi.mock("@/lib/db", () => ({ connectDB: async () => mongoose }));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({ NEXT_PUBLIC_SITE_NAME: "فروشگاه آزمایشی" }),
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-launchox-path": "/account" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
  notFound: () => {
    throw new Error("not-found");
  },
}));
vi.mock("@/actions/auth.actions", async () => {
  const guards = await import("@/lib/auth");
  return {
    getCurrentUser: guards.getCurrentUser,
    requireUser: guards.requireUser,
  };
});
vi.mock("@/services/user.service", () => ({ getProfile: mocks.profile }));
vi.mock("@/components/account/AccountForm", () => ({
  AccountForm: () => null,
}));

import { User } from "@/models/user";
import { getCurrentUser, requireAdmin, requireUser } from "@/lib/auth";
import AuthLayout from "@/app/(auth)/layout";
import AccountPage from "@/app/(shop)/account/page";

let server: Awaited<ReturnType<typeof startTestMongo>>;
beforeAll(async () => {
  server = await startTestMongo();
  await mongoose.connect(server.uri, {
    dbName: "launchox_role_refresh_test",
    bufferCommands: false,
  });
  await User.init();
}, 180000);
beforeEach(async () => {
  vi.clearAllMocks();
  await User.deleteMany({});
  mocks.profile.mockResolvedValue({
    name: "کاربر آزمایشی",
    email: "role@example.com",
  });
});
afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
});

it.each(["admin", "customer"] as const)(
  "applies role changes to guards and redirects without replacing the initial %s session",
  async (initialRole) => {
    const user = await User.create({
      name: "کاربر آزمایشی",
      email: "role@example.com",
      passwordHash: await hash("RoleTest123!", 12),
      role: initialRole,
    });
    const session = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: initialRole,
      },
    };
    mocks.auth.mockResolvedValue(session);

    for (const role of ["admin", "customer", "admin", "customer"] as const) {
      await User.updateOne({ _id: user._id }, { $set: { role } });
      expect(await getCurrentUser()).toEqual({ ...session.user, role });
      expect(await requireUser()).toEqual({ ...session.user, role });
      await expect(AuthLayout({ children: null })).rejects.toThrow(
        `redirect:${role === "admin" ? "/admin" : "/account"}`,
      );
      if (role === "admin") {
        expect(await requireAdmin()).toEqual({ ...session.user, role });
        await expect(AccountPage()).rejects.toThrow("redirect:/admin");
      } else {
        await expect(requireAdmin()).rejects.toThrow("not-found");
        await expect(AccountPage()).resolves.toBeDefined();
      }
      expect(session.user.role).toBe(initialRole);
    }

    await User.updateOne({ _id: user._id }, { $set: { isActive: false } });
    expect(await getCurrentUser()).toBeNull();
    await expect(AuthLayout({ children: null })).resolves.toBeDefined();
    await expect(AccountPage()).rejects.toThrow(
      "redirect:/login?callbackUrl=%2Faccount",
    );
    await expect(requireAdmin()).rejects.toThrow("redirect:/login");

    await User.deleteOne({ _id: user._id });
    expect(await getCurrentUser()).toBeNull();
    await expect(AuthLayout({ children: null })).resolves.toBeDefined();
    await expect(AccountPage()).rejects.toThrow("redirect:/login");
    await expect(requireAdmin()).rejects.toThrow("redirect:/login");
  },
);
