import assert from "node:assert/strict";
import test from "node:test";
import {
  createTestPaymentToken,
  verifyTestPaymentToken,
} from "../lib/payments/test-provider-token";

const ORIGINAL_SECRET = process.env.PAYMENT_TEST_SECRET;

test.beforeEach(() => {
  process.env.PAYMENT_TEST_SECRET = "local-test-secret-with-at-least-32-characters";
});

test.after(() => {
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.PAYMENT_TEST_SECRET;
  } else {
    process.env.PAYMENT_TEST_SECRET = ORIGINAL_SECRET;
  }
});

test("signed test payment token round-trips without exposing its secret", () => {
  const payload = {
    version: 1 as const,
    providerOrderId: "manual_12345678",
    amount: 2400,
    currency: "TWD",
    expiresAt: Date.now() + 60_000,
    nonce: "12345678-1234-1234-1234-123456789012",
  };
  const token = createTestPaymentToken(payload);

  assert.deepEqual(verifyTestPaymentToken(token), payload);
  assert.doesNotMatch(token, /local-test-secret/);
});

test("tampered and expired test payment tokens are rejected", () => {
  const token = createTestPaymentToken({
    version: 1,
    providerOrderId: "manual_12345678",
    amount: 2400,
    currency: "TWD",
    expiresAt: Date.now() + 60_000,
    nonce: "12345678-1234-1234-1234-123456789012",
  });
  const [payload, signature] = token.split(".");

  assert.throws(
    () => verifyTestPaymentToken(`${payload}.${signature}tampered`),
    /Invalid test payment signature/,
  );

  const expired = createTestPaymentToken({
    version: 1,
    providerOrderId: "manual_12345678",
    amount: 2400,
    currency: "TWD",
    expiresAt: Date.now() - 1,
    nonce: "12345678-1234-1234-1234-123456789012",
  });
  assert.throws(
    () => verifyTestPaymentToken(expired),
    /Test payment token has expired/,
  );
});
