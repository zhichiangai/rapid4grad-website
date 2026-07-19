import { createHmac, timingSafeEqual } from "node:crypto";

export type TestCheckoutPayload = {
  version: 1;
  providerOrderId: string;
  amount: number;
  currency: string;
  expiresAt: number;
  nonce: string;
};

function getTestSecret() {
  const secret = process.env.PAYMENT_TEST_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("Payment test secret is not configured");
  }

  return secret;
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getTestSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function createTestPaymentToken(payload: TestCheckoutPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function verifyTestPaymentToken(token: string): TestCheckoutPayload {
  if (token.length > 4096) throw new Error("Invalid test payment token");

  const [encodedPayload, providedSignature, extra] = token.split(".");
  if (!encodedPayload || !providedSignature || extra) {
    throw new Error("Invalid test payment token");
  }

  const expectedSignature = signPayload(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(providedSignature);

  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    throw new Error("Invalid test payment signature");
  }

  let payload: TestCheckoutPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as TestCheckoutPayload;
  } catch {
    throw new Error("Invalid test payment payload");
  }

  if (
    payload.version !== 1 ||
    typeof payload.providerOrderId !== "string" ||
    !Number.isInteger(payload.amount) ||
    payload.amount < 0 ||
    typeof payload.currency !== "string" ||
    payload.currency.length !== 3 ||
    typeof payload.expiresAt !== "number" ||
    typeof payload.nonce !== "string" ||
    payload.nonce.length < 16
  ) {
    throw new Error("Invalid test payment payload");
  }

  if (payload.expiresAt <= Date.now()) {
    throw new Error("Test payment token has expired");
  }

  return payload;
}
