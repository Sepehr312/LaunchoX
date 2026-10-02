import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { connectDB, getEnv, ping } = vi.hoisted(() => ({
  connectDB: vi.fn(),
  getEnv: vi.fn(),
  ping: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ connectDB }));
vi.mock("@/lib/env", () => ({ getEnv }));
import { GET } from "@/app/api/health/route";

afterEach(() => vi.resetAllMocks());

describe("health route", () => {
  it("pings MongoDB and returns an uncached plain DTO", async () => {
    connectDB.mockResolvedValue({
      connection: { db: { admin: () => ({ ping }) } },
    });
    ping.mockResolvedValue({ ok: 1 });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { status: "ok", db: "up" } });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(ping).toHaveBeenCalledOnce();
  });
  it.each(["connect", "ping", "missing"])(
    "reports db down on %s failure",
    async (failure) => {
      if (failure === "connect")
        connectDB.mockRejectedValue(new Error("Private database URI"));
      else if (failure === "missing")
        connectDB.mockResolvedValue({ connection: {} });
      else {
        connectDB.mockResolvedValue({
          connection: { db: { admin: () => ({ ping }) } },
        });
        ping.mockRejectedValue(new Error("Ping failed"));
      }
      const response = await GET();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        data: { status: "ok", db: "down" },
      });
    },
  );
  it("returns a generic Persian error for invalid configuration", async () => {
    getEnv.mockImplementation(() => {
      throw new Error("Secret configuration");
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await GET();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "تنظیمات سرور نامعتبر است",
    });
    expect(connectDB).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("Health check configuration failed");
    log.mockRestore();
  });
});
