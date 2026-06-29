import type { Json } from "@/types/database";

export type PaymentProviderName = "ecpay" | "newebpay" | "tappay" | "stripe";

export type PaymentOrderStatus =
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired"
  | "refunded";

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export type ProductSlug = "rapid4grad-course";

export type CheckoutProduct = {
  id: string;
  slug: string;
  name: string;
  amount: number;
  currency: string;
  durationMonths: number | null;
};

export type CheckoutOrder = {
  id: string;
  userId: string;
  productId: string;
  amount: number;
  currency: string;
  provider: PaymentProviderName;
  providerOrderId: string;
};

export type CreateCheckoutInput = {
  order: CheckoutOrder;
  product: CheckoutProduct;
  customer: {
    email: string;
    name?: string | null;
  };
  successUrl: string;
  failUrl: string;
};

export type CreateCheckoutResult = {
  checkoutUrl: string;
  providerOrderId: string;
  rawPayload?: Json;
};

export type VerifyWebhookInput = {
  headers: Headers;
  rawBody: string;
};

export type VerifyWebhookResult = {
  providerOrderId: string;
  providerPaymentId: string;
  status: PaymentStatus;
  paidAt?: string;
  rawPayload: Json;
};

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult>;
}
