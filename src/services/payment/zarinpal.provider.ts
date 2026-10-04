import "server-only";
import { AppError } from "@/lib/errors";
import type { PaymentProvider } from "@/services/payment/provider";

function notImplemented(): never {
  // Implement the real gateway here; convert toman to rial only if its API requires it.
  throw new AppError("درگاه واقعی هنوز پیاده‌سازی نشده است", "FORBIDDEN");
}

export const zarinpalProvider: PaymentProvider = {
  name: "zarinpal",
  async requestPayment() {
    return notImplemented();
  },
  async verifyPayment() {
    return notImplemented();
  },
};
