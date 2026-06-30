import type { PaymentProvider } from "../types";

export const ecpayProvider: PaymentProvider = {
  name: "ecpay",
  async createCheckout() {
    throw new Error("Not implemented");
  },
  async verifyWebhook() {
    throw new Error("Not implemented");
  },
};
