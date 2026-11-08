import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  request: vi.fn(),
  initial: vi.fn(),
  password: vi.fn(),
  change: vi.fn(),
  discard: vi.fn(),
  available: vi.fn(),
  cookie: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  requireUser: mocks.user,
  signIn: mocks.signIn,
  signOut: mocks.signOut,
}));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({ AUTH_TRUST_PROXY_HEADERS: false }),
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: mocks.cookie, delete: mocks.remove }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
  unstable_rethrow: (error: unknown) => {
    if (error instanceof Error && error.message.startsWith("redirect:"))
      throw error;
  },
}));
vi.mock("@/services/otp.service", () => ({
  requestOtp: mocks.request,
  discardInitialPasswordGrant: mocks.discard,
  hasInitialPasswordGrant: mocks.available,
}));
vi.mock("@/services/credential-security.service", () => ({
  setInitialPassword: mocks.initial,
  setPasswordWithOtp: mocks.password,
  changeMobileWithOtp: mocks.change,
}));
vi.mock("@/services/user.service", () => ({
  getProfile: async () => ({ mobile: "09123456789" }),
}));
import {
  requestOtpAction,
  verifyLoginOtpAction,
  initialPasswordAction,
  passwordOtpAction,
  changeMobileOtpAction,
} from "@/actions/otp.actions";
const actor = { id: "user-id", sessionVersion: 3 };
const ticket = {
  mobile: "09123456789",
  purpose: "login",
  challengeId: "a".repeat(64),
  code: "123456",
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue(actor);
  mocks.request.mockResolvedValue({ challengeId: ticket.challengeId });
});

it("takes the security actor from the authenticated session and rejects public admin enrollment", async () => {
  await requestOtpAction({
    mobile: ticket.mobile,
    purpose: "set-password",
    userId: "foreign",
  });
  expect(mocks.request).toHaveBeenCalledWith(
    { mobile: ticket.mobile, purpose: "set-password" },
    "unknown",
    actor,
  );
  expect(
    (
      await requestOtpAction({
        mobile: ticket.mobile,
        purpose: "admin-enrollment",
      })
    ).ok,
  ).toBe(false);
  expect(mocks.request).toHaveBeenCalledOnce();
});
it("never authenticates a client-supplied identity or a non-login OTP purpose", async () => {
  expect(
    (
      await verifyLoginOtpAction(
        { userId: "admin", mobile: ticket.mobile },
        "/checkout",
      )
    ).ok,
  ).toBe(false);
  expect(
    (
      await verifyLoginOtpAction(
        { ...ticket, purpose: "recovery" },
        "/checkout",
      )
    ).ok,
  ).toBe(false);
  expect(mocks.signIn).not.toHaveBeenCalled();
});
it("preserves callback through new-user onboarding and excludes secrets or roles from sign-in", async () => {
  mocks.cookie.mockReturnValue({ value: "b".repeat(64) });
  await expect(
    verifyLoginOtpAction(
      { ...ticket, userId: "admin", role: "admin" },
      "/checkout",
    ),
  ).rejects.toThrow("redirect:/account/welcome?callbackUrl=%2Fcheckout");
  expect(mocks.signIn).toHaveBeenCalledWith("otp", {
    ...ticket,
    redirect: false,
  });
});
it("sends existing users directly to a safe callback and sanitizes external callbacks", async () => {
  await expect(verifyLoginOtpAction(ticket, "/checkout")).rejects.toThrow(
    "redirect:/checkout",
  );
  await expect(verifyLoginOtpAction(ticket, "//evil.example")).rejects.toThrow(
    "redirect:/account",
  );
});
it("allows skipping password without losing checkout or requiring password fields", async () => {
  mocks.cookie.mockReturnValue({ value: "b".repeat(64) });
  const form = new FormData();
  form.set("operation", "skip");
  form.set("callbackUrl", "/checkout");
  await expect(initialPasswordAction(undefined, form)).rejects.toThrow(
    "redirect:/checkout",
  );
  expect(mocks.discard).toHaveBeenCalledWith("b".repeat(64), actor);
  expect(mocks.initial).not.toHaveBeenCalled();
  expect(mocks.remove).toHaveBeenCalledWith("initial_password");
});
it("uses the HttpOnly permission for initial password and replaces the revoked Auth.js session", async () => {
  mocks.cookie.mockReturnValue({ value: "b".repeat(64) });
  const form = new FormData();
  for (const [key, value] of Object.entries({
    operation: "save",
    password: "Customer123!",
    confirmPassword: "Customer123!",
    token: "attacker",
    callbackUrl: "/checkout",
  }))
    form.set(key, value);
  await expect(initialPasswordAction(undefined, form)).rejects.toThrow(
    "redirect:/checkout",
  );
  expect(mocks.initial).toHaveBeenCalledWith(
    expect.any(Object),
    "b".repeat(64),
    actor,
  );
  expect(mocks.signIn).toHaveBeenCalledWith("credentials", {
    mobile: ticket.mobile,
    password: "Customer123!",
    redirect: false,
  });
});
it("clears stale sessions after recovery and binds number changes to the current user", async () => {
  await passwordOtpAction(
    {
      ...ticket,
      purpose: "recovery",
      password: "Customer123!",
      confirmPassword: "Customer123!",
    },
    "/checkout",
  );
  expect(mocks.password).toHaveBeenCalledWith(
    expect.any(Object),
    "unknown",
    undefined,
  );
  expect(mocks.signOut).toHaveBeenCalledWith({
    redirectTo: "/login?callbackUrl=%2Fcheckout",
  });
  await changeMobileOtpAction({ userId: "foreign" });
  expect(mocks.change).toHaveBeenCalledWith(
    { userId: "foreign" },
    "unknown",
    actor,
  );
});
it("returns no provider details, password or OTP when authentication fails", async () => {
  mocks.signIn.mockRejectedValue(
    new Error("private-api-key 123456 Customer123!"),
  );
  const state = await verifyLoginOtpAction(ticket, "/checkout");
  expect(state.ok).toBe(false);
  expect(JSON.stringify(state)).not.toMatch(
    /private-api-key|123456|Customer123/,
  );
});
