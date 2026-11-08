import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const config = vi.hoisted(() => ({
  SMS_IR_API_KEY: "private-test-key",
  SMS_IR_TEMPLATE_ID: 608073,
  SMS_IR_ENABLED: true,
}));
vi.mock("@/lib/env", () => ({ getEnv: () => config }));
import { sendOtpSms } from "@/services/sms-ir.service";

afterEach(() => {
  vi.unstubAllGlobals();
  config.SMS_IR_ENABLED = true;
  config.SMS_IR_API_KEY = "private-test-key";
});
it("sends the confirmed template and OTP parameter only through server fetch", async () => {
  const fetch = vi.fn().mockResolvedValue(
    Response.json({
      status: 1,
      message: "موفق",
      data: { messageId: 123, cost: 1 },
    }),
  );
  vi.stubGlobal("fetch", fetch);
  await expect(sendOtpSms("09123456789", "123456")).resolves.toBeUndefined();
  expect(fetch).toHaveBeenCalledWith(
    "https://api.sms.ir/v1/send/verify",
    expect.objectContaining({
      method: "POST",
      redirect: "error",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": "private-test-key",
      },
      body: JSON.stringify({
        mobile: "09123456789",
        templateId: 608073,
        parameters: [{ name: "OTP", value: "123456" }],
      }),
    }),
  );
});
it.each([
  Response.json({ status: 10, message: "private-test-key 123456", data: null }),
  Response.json({ status: 1, message: "ok", data: {} }),
  Response.json({
    status: 1,
    message: "ok",
    data: { messageId: "bad", cost: 1 },
  }),
  new Response("not-json"),
  new Response("private-test-key 123456", { status: 500 }),
])(
  "rejects invalid HTTP/provider success without leaking response content",
  async (response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    await expect(sendOtpSms("09123456789", "123456")).rejects.toMatchObject({
      message: "درخواست ارسال کد تأیید نشد؛ کمی بعد دوباره تلاش کنید",
    });
  },
);
it.each([
  new DOMException("private-test-key 123456", "TimeoutError"),
  new Error("network private-test-key 123456"),
])(
  "handles network and timeout errors without leaking details",
  async (error) => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));
    await expect(sendOtpSms("09123456789", "123456")).rejects.toMatchObject({
      message: "درخواست ارسال کد تأیید نشد؛ کمی بعد دوباره تلاش کنید",
    });
  },
);
it("does not send unless explicitly enabled and configured", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  config.SMS_IR_ENABLED = false;
  await expect(sendOtpSms("09123456789", "123456")).rejects.toThrow();
  config.SMS_IR_ENABLED = true;
  config.SMS_IR_API_KEY = "";
  await expect(sendOtpSms("09123456789", "123456")).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
});
