import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  factory: undefined as
    | (() => {
        providers: {
          id?: string;
          options: {
            authorize: (
              credentials: Record<string, unknown>,
              request: Request,
            ) => Promise<unknown>;
          };
        }[];
      })
    | undefined,
  authenticate: vi.fn(),
  otp: vi.fn(),
  attempt: vi.fn(),
  merge: vi.fn(),
  remove: vi.fn(),
  set: vi.fn(),
}));
vi.mock("next-auth", async () => {
  const { CredentialsSignin } = await import("@auth/core/errors");
  return {
    CredentialsSignin,
    default: (factory: typeof mocks.factory) => {
      mocks.factory = factory;
      return {};
    },
  };
});
vi.mock("@/lib/auth.config", () => ({ getAuthConfig: () => ({}) }));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({ AUTH_TRUST_PROXY_HEADERS: false, NODE_ENV: "test" }),
}));
vi.mock("@/services/auth.service", () => ({
  authenticateUser: mocks.authenticate,
  getUserAccess: vi.fn(),
}));
vi.mock("@/services/auth-attempt.service", () => ({
  consumeStoredAuthAttempt: mocks.attempt,
}));
vi.mock("@/services/otp.service", () => ({ authenticateOtp: mocks.otp }));
vi.mock("@/services/cart.service", () => ({ mergeGuestCart: mocks.merge }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => ({ value: "123e4567-e89b-42d3-a456-426614174000" }),
    has: () => true,
    delete: mocks.remove,
    set: mocks.set,
  }),
}));
import "@/lib/auth";
const identity = { id: "user-id", role: "customer", sessionVersion: 0 };
const request = new Request("https://launchox.local/api/auth/callback", {
  method: "POST",
});
const otp = {
  mobile: "09123456789",
  purpose: "login",
  challengeId: "a".repeat(64),
  code: "123456",
};
function providers() {
  if (!mocks.factory) throw new Error("Missing Auth.js configuration");
  return mocks.factory().providers;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.attempt.mockResolvedValue(true);
  mocks.authenticate.mockResolvedValue(identity);
  mocks.otp.mockResolvedValue(identity);
  mocks.merge.mockResolvedValue(undefined);
});
it("validates and limits direct password-provider calls and merges guest carts", async () => {
  const provider = providers()[0].options;
  expect(
    await provider.authorize(
      { mobile: "۰۹۱۲۳۴۵۶۷۸۹", password: "Customer123!" },
      request,
    ),
  ).toEqual(identity);
  expect(mocks.authenticate).toHaveBeenCalledWith({
    mobile: "09123456789",
    password: "Customer123!",
  });
  expect(mocks.attempt).toHaveBeenCalledWith("login", "unknown", "۰۹۱۲۳۴۵۶۷۸۹");
  expect(mocks.merge).toHaveBeenCalledOnce();
  expect(mocks.remove).toHaveBeenCalledWith("cart_id");
  mocks.attempt.mockResolvedValue(false);
  await expect(
    provider.authorize(
      { mobile: otp.mobile, password: "Customer123!" },
      request,
    ),
  ).rejects.toMatchObject({ code: "rate_limit" });
  expect(mocks.authenticate).toHaveBeenCalledOnce();
});
it("requires real OTP verification in direct calls and never trusts a supplied user ID", async () => {
  const provider = providers()[1].options;
  expect(
    await provider.authorize(
      { ...otp, userId: "admin-id", role: "admin" },
      request,
    ),
  ).toEqual(identity);
  expect(mocks.otp).toHaveBeenCalledWith(otp, "unknown");
  expect(mocks.merge).toHaveBeenCalledOnce();
  mocks.otp.mockRejectedValue(new Error("invalid or inactive"));
  expect(await provider.authorize(otp, request)).toBeNull();
  expect(
    await provider.authorize(
      { userId: "admin-id", mobile: otp.mobile },
      request,
    ),
  ).toBeNull();
  expect(
    await provider.authorize({ ...otp, purpose: "recovery" }, request),
  ).toBeNull();
});
it.each([0, 1])(
  "preserves the guest cookie when merging fails for provider %s",
  async (index) => {
    mocks.merge.mockRejectedValue(new Error("merge failed"));
    const work = providers()[index].options.authorize(
      index ? otp : { mobile: otp.mobile, password: "Customer123!" },
      request,
    );
    if (index) expect(await work).toBeNull();
    else await expect(work).rejects.toThrow("merge failed");
    expect(mocks.remove).not.toHaveBeenCalledWith("cart_id");
  },
);
it("keeps initial password authorization in an HttpOnly cookie outside the returned identity", async () => {
  mocks.otp.mockResolvedValue({
    ...identity,
    initialPasswordGrant: "b".repeat(64),
  });
  expect(await providers()[1].options.authorize(otp, request)).toEqual(
    identity,
  );
  expect(mocks.set).toHaveBeenCalledWith(
    "initial_password",
    "b".repeat(64),
    expect.objectContaining({ httpOnly: true, sameSite: "lax", maxAge: 300 }),
  );
});
