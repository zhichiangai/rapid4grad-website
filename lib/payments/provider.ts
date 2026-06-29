import type { PaymentProvider, PaymentProviderName } from "./types";
import { ecpayProvider } from "./providers/ecpay";

const providers: Record<PaymentProviderName, PaymentProvider> = {
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
};

export function normalizePaymentProviderName(
  value: string | undefined,
): PaymentProviderName {
  if (
    value === "ecpay" ||
    value === "newebpay" ||
    value === "tappay" ||
    value === "stripe"
  ) {
    return value;
  }

  return "ecpay";
}

export function getPaymentProvider(
  providerName = process.env.PAYMENT_PROVIDER,
): PaymentProvider {
  return providers[normalizePaymentProviderName(providerName)];
}
