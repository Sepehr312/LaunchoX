import { describe, expect, it, vi, afterEach } from "vitest";

vi.mock("server-only", () => ({}));
import { envSchema, getEnv } from "@/lib/env";

const valid = {
  MONGODB_URI: "mongodb://127.0.0.1:27017/test",
  AUTH_SECRET: "a741e3f097ad580e71fd73b9df2c8410",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_SITE_NAME: "فروشگاه",
  PAYMENT_PROVIDER: "fake",
  SHIPPING_FLAT_FEE: "50000",
  FREE_SHIPPING_THRESHOLD: "1000000",
};

afterEach(() => vi.unstubAllEnvs());

describe("environment validation", () => {
  it("validates explicit image origins and normalizes default ports", () => {
    expect(
      envSchema.parse({
        ...valid,
        IMAGE_INTERNAL_ORIGINS: "https://old.test:443, http://legacy.test:8080",
      }).IMAGE_INTERNAL_ORIGINS,
    ).toEqual(["https://old.test", "http://legacy.test:8080"]);
    for (const origin of [
      "https://old.test/path",
      "https://*.test",
      "https://user:pass@old.test",
      "https://old.test?v=1",
      "invalid",
    ]) {
      expect(
        envSchema.safeParse({ ...valid, IMAGE_INTERNAL_ORIGINS: origin })
          .success,
      ).toBe(false);
    }
  });
  it("parses integer fees and allows omitted seed credentials", () => {
    const result = envSchema.parse(valid);
    expect(result.SHIPPING_FLAT_FEE).toBe(50000);
    expect(result.FREE_SHIPPING_THRESHOLD).toBe(1000000);
  });
  it.each(Object.keys(valid))("rejects missing %s", (key) => {
    const input: Record<string, string> = { ...valid };
    delete input[key];
    expect(envSchema.safeParse(input).success).toBe(false);
  });
  it.each(["", "-1", "1.5", " ", "9007199254740992", "Infinity"])(
    "rejects invalid money %s",
    (value) => {
      expect(
        envSchema.safeParse({ ...valid, SHIPPING_FLAT_FEE: value }).success,
      ).toBe(false);
    },
  );
  it("defaults AUTH_URL to the site URL in production", () => {
    expect(
      envSchema.safeParse({ ...valid, NODE_ENV: "production" }).success,
    ).toBe(true);
    expect(
      envSchema.safeParse({
        ...valid,
        NODE_ENV: "production",
        AUTH_URL: "https://example.com",
      }).success,
    ).toBe(true);
  });
  it.each([
    { MONGODB_URI: "https://example.com" },
    { PAYMENT_PROVIDER: "real" },
    { NEXT_PUBLIC_SITE_URL: "javascript:alert(1)" },
    { SEED_ADMIN_EMAIL: "invalid" },
    { SEED_ADMIN_PASSWORD: "short" },
  ])("rejects invalid configuration %j", (override) => {
    expect(envSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });
  it("reports invalid keys without exposing values", () => {
    Object.entries(valid).forEach(([key, value]) => vi.stubEnv(key, value));
    vi.stubEnv("MONGODB_URI", "private-invalid-value");
    expect(getEnv).toThrow("MONGODB_URI");
    expect(getEnv).not.toThrow("private-invalid-value");
  });
});

it.each(["", "   "])("normalizes optional blank settings %j", (blank) => {
  const parsed = envSchema.parse({
    ...valid,
    AUTH_TRUST_PROXY_HEADERS: blank,
    AUTH_URL: blank,
    SEED_ADMIN_EMAIL: blank,
    SEED_ADMIN_PASSWORD: blank,
    CONTACT_EMAIL: blank,
  });
  expect(parsed.AUTH_TRUST_PROXY_HEADERS).toBe(false);
  expect(parsed.AUTH_URL).toBe(valid.NEXT_PUBLIC_SITE_URL);
  expect(parsed.SEED_ADMIN_EMAIL).toBeUndefined();
  expect(parsed.SEED_ADMIN_PASSWORD).toBeUndefined();
});
it.each([
  "MONGODB_URI",
  "AUTH_SECRET",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SITE_NAME",
])("rejects blank required %s", (key) => {
  expect(envSchema.safeParse({ ...valid, [key]: "" }).success).toBe(false);
});
