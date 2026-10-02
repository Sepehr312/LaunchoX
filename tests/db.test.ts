import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({ MONGODB_URI: "mongodb://localhost/test" }),
}));
const { connect } = vi.hoisted(() => ({ connect: vi.fn() }));
vi.mock("mongoose", () => ({ default: { connect } }));
import { connectDB } from "@/lib/db";

afterEach(() => {
  globalThis.launchoxMongoosePromise = undefined;
  vi.resetAllMocks();
});

describe("cached database connection", () => {
  it("shares one connection between concurrent requests and module reloads", async () => {
    const connection = { connected: true };
    connect.mockResolvedValue(connection);
    const results = await Promise.all([connectDB(), connectDB(), connectDB()]);
    expect(results).toEqual([connection, connection, connection]);
    vi.resetModules();
    const reloaded = await import("@/lib/db");
    expect(await reloaded.connectDB()).toBe(connection);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledWith("mongodb://localhost/test", {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
  });
  it("retries after a failed connection", async () => {
    connect
      .mockRejectedValueOnce(new Error("Connection failed"))
      .mockResolvedValueOnce({ connected: true });
    await expect(connectDB()).rejects.toThrow("Connection failed");
    expect(globalThis.launchoxMongoosePromise).toBeUndefined();
    await expect(connectDB()).resolves.toEqual({ connected: true });
    expect(connect).toHaveBeenCalledTimes(2);
  });
});
