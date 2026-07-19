import type { PaymentProvider, PaymentProviderName } from "./types";
import { ecpayProvider } from "./providers/ecpay";
import { testPaymentProvider } from "./providers/test";

const providers: Record<string, PaymentProvider> = {
  test: testPaymentProvider,
  ecpay: ecpayProvider,
  newebpay: {
    name: "newebpay",
    async createCheckout() {
      throw new Error("Not implemented");
    },
    async verifyWebhook() {
      throw new Error("Not implemented");
    },
  },
  tappay: {
    name: "tappay",
    async createCheckout() {
      throw new Error("Not implemented");
    },
    async verifyWebhook() {
      throw new Error("Not implemented");
    },
  },
  stripe: {
    name: "stripe",
    async createCheckout() {
      throw new Error("Not implemented");
    },
    async verifyWebhook() {
      throw new Error("Not implemented");
    },
  },
  manual: testPaymentProvider,
};

export function normalizePaymentProviderName(value: string | undefined) {
  if (
    value === "test" ||
    value === "ecpay" ||
    value === "newebpay" ||
    value === "tappay" ||
    value === "stripe" ||
    value === "manual"
  ) {
    return value;
  }

  return null;
}

export function getPaymentProvider(
  providerName = process.env.PAYMENT_PROVIDER,
): PaymentProvider {
  const normalized = normalizePaymentProviderName(providerName);

  if (!normalized) {
    throw new Error("Payment provider is not configured");
  }

  if (
    (normalized === "test" || normalized === "manual") &&
    process.env.NODE_ENV === "production"
  ) {
    throw new Error("Test payment provider is disabled in production");
  }

  return providers[normalized];
}

export function getConfiguredDatabaseProviderName(): PaymentProviderName | null {
  const normalized = normalizePaymentProviderName(process.env.PAYMENT_PROVIDER);

  if (!normalized) return null;
  if (normalized === "test") return "manual";
  return normalized;
}
