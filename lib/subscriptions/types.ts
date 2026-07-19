import type { Json } from "@/types/database-v2.generated";

export type ProfessorPlanKey =
  | "professor_lab_standard"
  | "professor_lab_plus";

export type SubscriptionBillingInterval = "month" | "year";

export type SubscriptionCheckoutOrder = {
  id: string;
  subscriptionId: string;
  providerOrderId: string;
  amount: number;
  currency: string;
  productName: string;
  planKey: ProfessorPlanKey;
  billingInterval: SubscriptionBillingInterval;
};

export type SubscriptionCustomer = {
  email: string;
  name?: string | null;
};

export type CreateSubscriptionCheckoutInput = {
  order: SubscriptionCheckoutOrder;
  customer: SubscriptionCustomer;
  siteUrl: string;
};

export type SubscriptionCheckoutResult = {
  mode: "form_post";
  actionUrl: string;
  fields: Record<string, string>;
};

export type VerifySubscriptionNotificationInput = {
  rawBody: string;
};

export type VerifiedSubscriptionNotification = {
  eventId: string;
  providerOrderId: string;
  providerPaymentId: string;
  outcome: "paid" | "failed";
  amount: number;
  currency: "TWD";
  eventCreatedAt: string;
  errorCode: string | null;
  rawPayload: Json;
};

export interface SubscriptionProvider {
  readonly name: "ecpay";
  createCheckout(
    input: CreateSubscriptionCheckoutInput,
  ): Promise<SubscriptionCheckoutResult>;
  verifyNotification(
    input: VerifySubscriptionNotificationInput,
  ): Promise<VerifiedSubscriptionNotification>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
}
