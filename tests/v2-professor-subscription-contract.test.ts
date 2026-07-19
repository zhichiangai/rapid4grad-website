import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createEcpayCheckMacValue,
  verifyEcpayCheckMacValue,
} from "../lib/subscriptions/ecpay-signature";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260719082208_professor_subscription_and_trials.sql",
    import.meta.url,
  ),
  "utf8",
);
const ecpayProvider = readFileSync(
  new URL("../lib/subscriptions/ecpay.ts", import.meta.url),
  "utf8",
);
const checkoutRoute = readFileSync(
  new URL("../app/api/billing/checkout/route.ts", import.meta.url),
  "utf8",
);

test("official ECPay checksum example matches", () => {
  const fields = {
    ChoosePayment: "ALL",
    EncryptType: "1",
    ItemName: "Apple iphone 15",
    MerchantID: "3002607",
    MerchantTradeDate: "2023/03/12 15:30:23",
    MerchantTradeNo: "ecpay20230312153023",
    PaymentType: "aio",
    ReturnURL: "https://www.ecpay.com.tw/receive.php",
    TotalAmount: "30000",
    TradeDesc: "促銷方案",
  };
  const expected =
    "6C51C9E6888DE861FD62FB1DD17029FC742634498FD813DC43D4243B5685B840";
  const actual = createEcpayCheckMacValue(
    fields,
    "pwFHCqoQZGmho4w6",
    "EkRm7iFT261dpevs",
  );
  assert.equal(actual, expected);
  assert.equal(
    verifyEcpayCheckMacValue(
      { ...fields, CheckMacValue: actual },
      "pwFHCqoQZGmho4w6",
      "EkRm7iFT261dpevs",
    ),
    true,
  );
  assert.equal(
    verifyEcpayCheckMacValue(
      { ...fields, TotalAmount: "1", CheckMacValue: actual },
      "pwFHCqoQZGmho4w6",
      "EkRm7iFT261dpevs",
    ),
    false,
  );
});

test("Task 5 migration encodes the confirmed trial and grace rules", () => {
  assert.match(migration, /interval '30 days'/);
  assert.match(migration, /interval '15 days'/);
  assert.match(migration, /professor_subscription_trials/);
  assert.match(migration, /UNIQUE REFERENCES auth\.users/);
  assert.match(migration, /professor_lab_standard[\s\S]*THEN 15/);
  assert.match(migration, /professor_lab_plus[\s\S]*THEN 30/);
  assert.match(migration, /target_event_created_at = selected_subscription\.last_provider_event_created_at/);
  assert.match(migration, /incoming_rank >= existing_rank/);
  assert.doesNotMatch(migration, /INSERT INTO public\.lab_usage_credits/);
  assert.doesNotMatch(migration, /pdf_audit_limit\s*[,)]\s*(?:[1-9]\d*)/);
});

test("subscription RPCs remain service-only", () => {
  for (const functionName of [
    "start_professor_subscription_trial",
    "create_professor_subscription_checkout_order",
    "prepare_professor_subscription_upgrade",
    "process_professor_subscription_event",
    "mark_professor_subscription_cancel_at_period_end",
  ]) {
    assert.match(
      migration,
      new RegExp(
        `REVOKE ALL ON FUNCTION public\\.${functionName}[\\s\\S]*?FROM PUBLIC, anon, authenticated;`,
      ),
    );
  }
});

test("ECPay cancellation uses the documented endpoint and verifies the response", () => {
  assert.match(
    ecpayProvider,
    /payment-stage\.ecpay\.com\.tw\/Cashier\/CreditCardPeriodAction/,
  );
  assert.match(
    ecpayProvider,
    /payment\.ecpay\.com\.tw\/Cashier\/CreditCardPeriodAction/,
  );
  assert.match(ecpayProvider, /const responseBody = await response\.text\(\)/);
  assert.match(
    ecpayProvider,
    /verifyEcpayCheckMacValue\(payload, config\.hashKey, config\.hashIv\)/,
  );
  assert.match(ecpayProvider, /payload\.MerchantTradeNo !== providerSubscriptionId/);
  assert.match(ecpayProvider, /payload\.RtnCode === "90100149"/);
});

test("paid provider subscriptions only allow a controlled Standard to Plus upgrade", () => {
  assert.match(
    migration,
    /selected_subscription\.plan_key = 'professor_lab_standard'[\s\S]*?target_plan_key = 'professor_lab_plus'[\s\S]*?is_upgrade := TRUE/,
  );
  assert.match(migration, /provider_plan_change_requires_manual_support/);
  assert.match(migration, /retiredProviderSubscriptionIds/);
  assert.match(migration, /is_retired_provider_order/);
  assert.match(migration, /upgradePaymentFailed/);
  assert.match(
    migration,
    /is_upgrade_order[\s\S]*?incoming_status = 'past_due'::public\.subscription_status[\s\S]*?selected_order\.status IN \([\s\S]*?'pending'::public\.order_status[\s\S]*?'processing'::public\.order_status[\s\S]*?\)/,
  );
});

test("checkout always retires Standard and cancels its active schedule first", () => {
  assert.match(checkoutRoute, /if \(result\.isUpgrade\)/);
  assert.match(
    checkoutRoute,
    /if \(result\.requiresProviderCancellation\) \{[\s\S]*?await provider\.cancelSubscription/,
  );
  const cancelPosition = checkoutRoute.indexOf(
    "await provider.cancelSubscription(",
  );
  const preparePosition = checkoutRoute.indexOf(
    '"prepare_professor_subscription_upgrade"',
  );
  assert.ok(cancelPosition >= 0);
  assert.ok(preparePosition > cancelPosition);
});

test("idempotent checkout retries return every provider input field", () => {
  const reuseBranch = migration.match(
    /IF FOUND THEN[\s\S]*?'reused', TRUE[\s\S]*?END IF;/,
  )?.[0];
  assert.ok(reuseBranch);
  for (const field of ["productName", "planKey", "billingInterval"]) {
    assert.match(reuseBranch, new RegExp(`'${field}'`));
  }
});
