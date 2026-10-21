import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  next: vi.fn(),
  order: vi.fn(),
  product: vi.fn(),
}));
vi.mock("@/services/order.service", () => ({ getOrderForUser: mocks.order }));
vi.mock("@/services/product.service", () => ({
  getProductBySlug: mocks.product,
}));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({ NEXT_PUBLIC_SITE_URL: "http://localhost:3020" }),
}));
vi.mock("@/lib/auth.config", () => ({
  getAuthConfig: () => ({ providers: [] }),
}));
vi.mock("next-auth", () => ({
  default: () => ({
    auth: (handler: (request: unknown) => unknown) => Promise.resolve(handler),
  }),
}));
vi.mock("next/server", () => ({
  NextResponse: class extends Response {
    static redirect(url: URL) {
      return Response.redirect(url);
    }
    static next = mocks.next;
    static rewrite(url: URL, init: ResponseInit) {
      return new Response(null, {
        ...init,
        headers: { ...init.headers, "x-middleware-rewrite": url.toString() },
      });
    }
  },
}));
import { AppError } from "@/lib/errors";
import proxy, { config } from "@/proxy";

function request(
  path: string,
  authenticated = false,
  role: "customer" | "admin" = "customer",
) {
  return {
    nextUrl: Object.assign(new URL(path, "http://localhost:3000"), {
      clone: () => new URL(path, "http://localhost:3000"),
    }),
    headers: new Headers({ "x-launchox-path": "/spoofed" }),
    auth: authenticated ? { user: { id: "user", role } } : null,
  } as unknown as Parameters<typeof proxy>[0];
}
const event = {} as Parameters<typeof proxy>[1];
beforeEach(() => {
  vi.clearAllMocks();
  mocks.product.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("صفحه پیدا نشد")),
  );
  mocks.next.mockReturnValue(new Response(null));
});
afterEach(() => vi.unstubAllGlobals());
it("excludes public product routes from proxy interception", () => {
  expect(config.matcher).not.toContain("/products/:slug");
  expect(config.matcher.every((path) => !path.startsWith("/products"))).toBe(
    true,
  );
});
it.each(["active-product", "missing-product", "invalid_slug", "%E0%A4%A"])(
  "does not look up product %s even when invoked directly",
  async (slug) => {
    mocks.product.mockRejectedValue(new Error("Database unavailable"));
    const response = await proxy(request(`/products/${slug}`), event);
    expect(response?.status).toBe(200);
    expect(mocks.product).not.toHaveBeenCalled();
    expect(mocks.order).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  },
);
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
it("passes authenticated requests and overwrites spoofed current-path headers", async () => {
  await proxy(request("/account?tab=orders", true), event);
  expect(
    mocks.next.mock.calls[0][0].request.headers.get("x-launchox-path"),
  ).toBe("/account?tab=orders");
});

it.each([
  "/login",
  "/register",
  "/account",
  "/account/",
  "/account?tab=orders",
])(
  "defers role decisions on %s to the server regardless of JWT role",
  async (path) => {
    for (const role of ["admin", "customer"] as const) {
      const response = await proxy(request(path, true, role), event);
      expect(response?.headers.get("location")).toBeNull();
      expect(response?.status).toBe(200);
    }
    expect(mocks.order).not.toHaveBeenCalled();
    expect(mocks.product).not.toHaveBeenCalled();
  },
);

it.each(["/account", "/account/", "/checkout", "/admin/products"])(
  "preserves customer account access and explicit destinations on %s",
  async (path) => {
    const role =
      path === "/account" || path === "/account/" ? "customer" : "admin";
    const response = await proxy(request(path, true, role), event);
    expect(response?.status).toBe(200);
    expect(response?.headers.get("location")).toBeNull();
  },
);

it("returns HTTP 404 for foreign orders before streaming", async () => {
  mocks.order.mockRejectedValueOnce(
    new AppError("سفارش پیدا نشد", "NOT_FOUND"),
  );
  const response = await proxy(
    request("/account/orders/507f1f77bcf86cd799439011", true),
    event,
  );
  expect(response?.status).toBe(404);
  expect(mocks.order).toHaveBeenCalledWith("user", "507f1f77bcf86cd799439011");
});
it("rejects malformed order IDs without a database lookup", async () => {
  expect(
    (await proxy(request("/account/orders/invalid", true), event))?.status,
  ).toBe(404);
  expect(mocks.order).not.toHaveBeenCalled();
});
it("passes owned orders and propagates database errors", async () => {
  mocks.order.mockResolvedValueOnce({ id: "owned" });
  expect(
    (
      await proxy(
        request("/account/orders/507f1f77bcf86cd799439011", true),
        event,
      )
    )?.status,
  ).toBe(200);
  mocks.order.mockRejectedValueOnce(new Error("Database unavailable"));
  await expect(
    proxy(request("/account/orders/507f1f77bcf86cd799439011", true), event),
  ).rejects.toThrow("Database unavailable");
});
