import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ next: vi.fn() }));
vi.mock("@/lib/auth.config", () => ({
  getAuthConfig: () => ({ providers: [] }),
}));
vi.mock("next-auth", () => ({
  default: () => ({
    auth: (handler: (request: unknown) => unknown) => Promise.resolve(handler),
  }),
}));
vi.mock("next/server", () => ({
  NextResponse: {
    redirect: (url: URL) => Response.redirect(url),
    next: mocks.next,
  },
}));
import proxy from "@/proxy";

function request(path: string, authenticated = false) {
  return {
    nextUrl: new URL(path, "http://localhost:3000"),
    headers: new Headers({ "x-launchox-path": "/spoofed" }),
    auth: authenticated ? { user: { id: "user" } } : null,
  } as unknown as Parameters<typeof proxy>[0];
}
const event = {} as Parameters<typeof proxy>[1];
beforeEach(() => {
  vi.clearAllMocks();
  mocks.next.mockReturnValue(new Response(null));
});
it("exports a callable proxy even when Auth.js resolves its wrapper asynchronously", async () => {
  expect(typeof proxy).toBe("function");
  const response = await proxy(request("/account?tab=orders"), event);
  expect(response?.headers.get("location")).toBe(
    "http://localhost:3000/login?callbackUrl=%2Faccount%3Ftab%3Dorders",
  );
});
it.each(["/admin", "/admin/users", "/checkout", "/account/addresses"])(
  "redirects guest on %s",
  async (path) => {
    const response = await proxy(request(path), event);
    expect(response?.status).toBe(302);
    expect(response?.headers.get("location")).toContain("/login?callbackUrl=");
  },
);
it.each(["/login", "/register"])(
  "redirects authenticated visitors from %s",
  async (path) => {
    const response = await proxy(request(path, true), event);
    expect(response?.headers.get("location")).toBe("http://localhost:3000/");
  },
);
it("passes authenticated requests and overwrites spoofed current-path headers", async () => {
  await proxy(request("/account?tab=orders", true), event);
  expect(
    mocks.next.mock.calls[0][0].request.headers.get("x-launchox-path"),
  ).toBe("/account?tab=orders");
});
