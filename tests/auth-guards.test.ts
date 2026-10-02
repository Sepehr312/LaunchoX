import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
  notFound: vi.fn(),
  headers: vi.fn(),
}));
vi.mock("next-auth", async () => {
  const { CredentialsSignin } = await import("@auth/core/errors");
  return { CredentialsSignin, default: () => ({ auth: mocks.auth }) };
});
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/services/auth.service", () => ({ authenticateUser: vi.fn() }));
import { getCurrentUser, requireUser, requireAdmin } from "@/lib/auth";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.headers.mockResolvedValue(
    new Headers({ "x-launchox-path": "/account?tab=orders" }),
  );
  mocks.redirect.mockImplementation(() => {
    throw new Error("redirect");
  });
  mocks.notFound.mockImplementation(() => {
    throw new Error("not-found");
  });
});
it("redirects guests to login preserving the current path", async () => {
  mocks.auth.mockResolvedValue(null);
  expect(await getCurrentUser()).toBeNull();
  await expect(requireUser()).rejects.toThrow("redirect");
  expect(mocks.redirect).toHaveBeenCalledWith(
    "/login?callbackUrl=%2Faccount%3Ftab%3Dorders",
  );
});
it("conceals admin pages from customers and accepts admins", async () => {
  mocks.auth.mockResolvedValue({ user: { id: "123", role: "customer" } });
  await expect(requireAdmin()).rejects.toThrow("not-found");
  expect(mocks.notFound).toHaveBeenCalledOnce();
  mocks.auth.mockResolvedValue({ user: { id: "456", role: "admin" } });
  expect(await requireAdmin()).toEqual({ id: "456", role: "admin" });
});
