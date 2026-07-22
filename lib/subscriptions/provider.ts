import "server-only";

import { ecpaySubscriptionProvider } from "./ecpay";
import type { SubscriptionProvider } from "./types";

export function getSubscriptionProvider(): SubscriptionProvider {
  const configured = process.env.SUBSCRIPTION_PROVIDER?.trim();

  if (configured !== "ecpay") {
    throw new Error("Professor subscription provider is not configured");
  }

  return ecpaySubscriptionProvider;
}
