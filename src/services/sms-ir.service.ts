import "server-only";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";

const responseSchema = z.object({
  status: z.literal(1),
  message: z.string(),
  data: z.object({
    messageId: z.number().int().positive(),
    cost: z.number().finite().nonnegative(),
  }),
});

export async function sendOtpSms(mobile: string, code: string): Promise<void> {
  const env = getEnv();
  if (!env.SMS_IR_API_KEY || !env.SMS_IR_ENABLED)
    throw new AppError("ارسال کد در حال حاضر در دسترس نیست", "VALIDATION");
  try {
    const response = await fetch("https://api.sms.ir/v1/send/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": env.SMS_IR_API_KEY,
      },
      body: JSON.stringify({
        mobile,
        templateId: env.SMS_IR_TEMPLATE_ID,
        parameters: [{ name: "OTP", value: code }],
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
      redirect: "error",
    });
    if (
      !response.ok ||
      !responseSchema.safeParse(await response.json()).success
    )
      throw new Error("SMS request rejected");
  } catch {
    // Provider errors can contain credentials or the submitted code.
    throw new AppError(
      "درخواست ارسال کد تأیید نشد؛ کمی بعد دوباره تلاش کنید",
      "VALIDATION",
    );
  }
}
