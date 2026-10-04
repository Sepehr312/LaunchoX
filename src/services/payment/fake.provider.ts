import "server-only";
import { randomUUID } from "node:crypto";
import { getEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { paymentCallbackSchema } from "@/validations/order";
import type { PaymentProvider } from "@/services/payment/provider";

export function requireFakePaymentEnabled() {
  if (getEnv().NODE_ENV === "production")
    throw new AppError(
      "درگاه آزمایشی در محیط عملیاتی غیرفعال است",
      "FORBIDDEN",
    );
}

export const fakeProvider: PaymentProvider = {
  name: "fake",
  async requestPayment() {
    requireFakePaymentEnabled();
    const authority = randomUUID();
    return {
      authority,
      redirectUrl: `/checkout/fake-gateway?authority=${authority}`,
    };
  },
  async verifyPayment(input) {
    requireFakePaymentEnabled();
    const data = paymentCallbackSchema.parse({
      ...input.params,
      authority: input.authority,
    });
    return data.status === "OK"
      ? { success: true, refId: `FAKE-${input.authority}` }
      : { success: false, message: "پرداخت لغو شد" };
  },
};
