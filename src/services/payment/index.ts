import "server-only";
import { getEnv } from "@/lib/env";
import {
  fakeProvider,
  requireFakePaymentEnabled,
} from "@/services/payment/fake.provider";
import type { PaymentProvider } from "@/services/payment/provider";

export function getPaymentProvider(): PaymentProvider {
  switch (getEnv().PAYMENT_PROVIDER) {
    case "fake":
      requireFakePaymentEnabled();
      return fakeProvider;
  }
}
