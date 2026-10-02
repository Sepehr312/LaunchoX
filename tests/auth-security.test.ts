import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { consumeAuthAttempt, getClientIp } from "@/lib/rate-limit";
import { safeCallbackUrl } from "@/validations/auth";

beforeEach(() => {
  globalThis.launchoxAuthAttempts = undefined;
});
describe("authentication rate limit", () => {
  it("allows five attempts, blocks the sixth and resets after fifteen minutes", () => {
    for (let index = 0; index < 5; index++)
      expect(consumeAuthAttempt("login", "127.0.0.1", 0)).toBe(true);
    expect(consumeAuthAttempt("login", "127.0.0.1", 899999)).toBe(false);
    expect(consumeAuthAttempt("login", "127.0.0.1", 900000)).toBe(true);
  });
  it("isolates IPs and registration attempts and uses a shared fallback for missing IPs", () => {
    for (let index = 0; index < 5; index++)
      consumeAuthAttempt("register", "127.0.0.1", 0);
    expect(consumeAuthAttempt("register", "127.0.0.1", 1)).toBe(false);
    expect(consumeAuthAttempt("login", "127.0.0.1", 1)).toBe(true);
    expect(consumeAuthAttempt("register", "127.0.0.2", 1)).toBe(true);
    expect(getClientIp(new Headers())).toBe("unknown");
    expect(getClientIp(new Headers({ "x-forwarded-for": "bad" }))).toBe(
      "unknown",
    );
    expect(
      getClientIp(new Headers({ "x-forwarded-for": "127.0.0.1, 10.0.0.1" })),
    ).toBe("127.0.0.1");
    expect(getClientIp(new Headers({ "x-real-ip": "::1" }))).toBe("::1");
  });
});
describe("callback destinations", () => {
  it.each(["/", "/account", "/account?tab=orders", "/admin"])(
    "allows local destination %s",
    (path) => {
      expect(safeCallbackUrl(path)).toBe(path);
    },
  );
  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/%5cevil",
    "/%2fevil",
    "/login",
    "/register?callbackUrl=/",
    "/api/auth/signout",
    "/bad%",
    ["/admin"],
    undefined,
    "/\nevil",
  ])("rejects unsafe destination %s", (path) => {
    expect(safeCallbackUrl(path)).toBe("/");
  });
});
