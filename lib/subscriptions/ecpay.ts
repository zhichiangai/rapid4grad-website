import "server-only";

import { createHash } from "node:crypto";
import {
  createEcpayCheckMacValue,
  verifyEcpayCheckMacValue,
} from "./ecpay-signature";
import type {
  SubscriptionBillingInterval,
  SubscriptionProvider,
  VerifiedSubscriptionNotification,
} from "./types";

const STAGE_CHECKOUT_URL =
  "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5";
const PRODUCTION_CHECKOUT_URL =
  "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5";
const STAGE_PERIOD_ACTION_URL =
  "https://payment-stage.ecpay.com.tw/Cashier/CreditCardPeriodAction";
const PRODUCTION_PERIOD_ACTION_URL =
  "https://payment.ecpay.com.tw/Cashier/CreditCardPeriodAction";

type EcpayConfig = {
  merchantId: string;
  hashKey: string;
  hashIv: string;
  checkoutUrl: string;
  periodActionUrl: string;
};

function getConfig(): EcpayConfig {
  const merchantId = process.env.ECPAY_MERCHANT_ID?.trim();
  const hashKey = process.env.ECPAY_HASH_KEY?.trim();
  const hashIv = process.env.ECPAY_HASH_IV?.trim();
  const production = process.env.ECPAY_ENVIRONMENT === "production";

  if (!merchantId || !hashKey || !hashIv) {
    throw new Error("ECPay subscription credentials are not configured");
  }

  return {
    merchantId,
    hashKey,
    hashIv,
    checkoutUrl: production ? PRODUCTION_CHECKOUT_URL : STAGE_CHECKOUT_URL,
    periodActionUrl: production
      ? PRODUCTION_PERIOD_ACTION_URL
      : STAGE_PERIOD_ACTION_URL,
  };
}

function formatTaipeiDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}/${values.month}/${values.day} ${values.hour}:${values.minute}:${values.second}`;
}

function parseEcpayDate(value: string | undefined) {
  if (!value) return new Date();
  const normalized = value.replace(
    /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
    "$1-$2-$3T$4:$5:$6+08:00",
  );
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function recurringFields(interval: SubscriptionBillingInterval) {
  return interval === "month"
    ? { PeriodType: "M", Frequency: "1", ExecTimes: "99" }
    : { PeriodType: "Y", Frequency: "1", ExecTimes: "9" };
}

function parseNotification(rawBody: string) {
  if (rawBody.length === 0 || rawBody.length > 32_000) {
    throw new Error("Invalid ECPay notification body");
  }

  const values: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(rawBody)) {
    if (key.length > 80 || value.length > 8_000) {
      throw new Error("Invalid ECPay notification field");
    }
    values[key] = value;
  }
  return values;
}

function stableEventId(fields: Record<string, string>) {
  const stable = Object.entries(fields)
    .filter(([key]) => key !== "CheckMacValue")
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return createHash("sha256").update(stable).digest("hex");
}

export const ecpaySubscriptionProvider: SubscriptionProvider = {
  name: "ecpay",

  async createCheckout(input) {
    const config = getConfig();
    const recurring = recurringFields(input.order.billingInterval);
    const fields: Record<string, string> = {
      MerchantID: config.merchantId,
      MerchantTradeNo: input.order.providerOrderId,
      MerchantTradeDate: formatTaipeiDate(new Date()),
      PaymentType: "aio",
      TotalAmount: String(input.order.amount),
      TradeDesc: "RAPID4GRAD Professor Lab Subscription",
      ItemName: input.order.productName.slice(0, 200),
      ReturnURL: `${input.siteUrl}/api/billing/webhook/ecpay`,
      PeriodReturnURL: `${input.siteUrl}/api/billing/webhook/ecpay`,
      ClientBackURL: `${input.siteUrl}/billing`,
      ChoosePayment: "Credit",
      EncryptType: "1",
      PeriodAmount: String(input.order.amount),
      CustomField1: input.order.id,
      CustomField2: input.order.subscriptionId,
      ...recurring,
    };
    fields.CheckMacValue = createEcpayCheckMacValue(
      fields,
      config.hashKey,
      config.hashIv,
    );

    return { mode: "form_post", actionUrl: config.checkoutUrl, fields };
  },

  async verifyNotification(input): Promise<VerifiedSubscriptionNotification> {
    const config = getConfig();
    const fields = parseNotification(input.rawBody);

    if (!verifyEcpayCheckMacValue(fields, config.hashKey, config.hashIv)) {
      throw new Error("Invalid ECPay notification signature");
    }

    if (fields.MerchantID !== config.merchantId) {
      throw new Error("Unexpected ECPay merchant");
    }

    const amount = Number(
      fields.amount ?? fields.PeriodAmount ?? fields.TradeAmt ?? "",
    );
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error("Invalid ECPay notification amount");
    }

    const providerOrderId = fields.MerchantTradeNo;
    if (!providerOrderId || providerOrderId.length > 20) {
      throw new Error("Invalid ECPay merchant trade number");
    }

    const eventDate = parseEcpayDate(
      fields.process_date ?? fields.ProcessDate ?? fields.TradeDate,
    );
    const providerPaymentId =
      fields.TradeNo ||
      `${providerOrderId}:${fields.TotalSuccessTimes ?? eventDate.getTime()}`;

    return {
      eventId: stableEventId(fields),
      providerOrderId,
      providerPaymentId,
      outcome: fields.RtnCode === "1" ? "paid" : "failed",
      amount,
      currency: "TWD",
      eventCreatedAt: eventDate.toISOString(),
      errorCode: fields.RtnCode === "1" ? null : fields.RtnCode ?? "unknown",
      rawPayload: fields,
    };
  },

  async cancelSubscription(providerSubscriptionId) {
    const config = getConfig();
    const fields: Record<string, string> = {
      MerchantID: config.merchantId,
      MerchantTradeNo: providerSubscriptionId,
      Action: "Cancel",
      TimeStamp: String(Math.floor(Date.now() / 1000)),
    };
    fields.CheckMacValue = createEcpayCheckMacValue(
      fields,
      config.hashKey,
      config.hashIv,
    );

    const response = await fetch(config.periodActionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields).toString(),
      cache: "no-store",
    });
    const responseBody = await response.text();
    const payload = parseNotification(responseBody);

    if (!verifyEcpayCheckMacValue(payload, config.hashKey, config.hashIv)) {
      throw new Error("Invalid ECPay cancellation signature");
    }

    if (
      payload.MerchantID !== config.merchantId ||
      payload.MerchantTradeNo !== providerSubscriptionId
    ) {
      throw new Error("Unexpected ECPay cancellation response");
    }

    if (!response.ok || payload.RtnCode !== "1") {
      throw new Error(payload.RtnMsg || "ECPay cancellation failed");
    }
  },
};
