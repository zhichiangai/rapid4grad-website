import assert from "node:assert/strict";
import test from "node:test";
import {
  shouldApplySubscriptionEvent,
  shouldRestrictSubscription,
} from "../lib/stripe/event-ordering";

const fixtures = {
  existing: "2026-07-11T01:00:00.000Z",
  older: "2026-07-11T00:59:59.000Z",
  equal: "2026-07-11T01:00:00.000Z",
  newer: "2026-07-11T01:00:01.000Z",
};

test("new subscription event applies when no local event timestamp exists", () => {
  assert.equal(
    shouldApplySubscriptionEvent({
      existingEventCreatedAt: null,
      incomingEventCreatedAt: fixtures.newer,
      existingStatus: null,
      incomingStatus: "active",
      existingCancelAtPeriodEnd: false,
      incomingCancelAtPeriodEnd: false,
      forceRestrict: false,
    }),
    true,
  );
});

test("older Stripe events cannot overwrite newer local state", () => {
  assert.equal(
    shouldApplySubscriptionEvent({
      existingEventCreatedAt: fixtures.existing,
      incomingEventCreatedAt: fixtures.older,
      existingStatus: "active",
      incomingStatus: "canceled",
      existingCancelAtPeriodEnd: false,
      incomingCancelAtPeriodEnd: false,
      forceRestrict: true,
    }),
    false,
  );
});

test("newer event applies even when subscription period end is unchanged", () => {
  assert.equal(
    shouldApplySubscriptionEvent({
      existingEventCreatedAt: fixtures.existing,
      incomingEventCreatedAt: fixtures.newer,
      existingStatus: "canceled",
      incomingStatus: "active",
      existingCancelAtPeriodEnd: true,
      incomingCancelAtPeriodEnd: false,
      forceRestrict: false,
    }),
    true,
  );
});

test("equal-second active to canceled applies the stricter state", () => {
  assert.equal(
    shouldApplySubscriptionEvent({
      existingEventCreatedAt: fixtures.equal,
      incomingEventCreatedAt: fixtures.equal,
      existingStatus: "active",
      incomingStatus: "canceled",
      existingCancelAtPeriodEnd: false,
      incomingCancelAtPeriodEnd: false,
      forceRestrict: true,
    }),
    true,
  );
});

test("equal-second canceled to active cannot restore entitlement", () => {
  assert.equal(
    shouldApplySubscriptionEvent({
      existingEventCreatedAt: fixtures.equal,
      incomingEventCreatedAt: fixtures.equal,
      existingStatus: "canceled",
      incomingStatus: "active",
      existingCancelAtPeriodEnd: false,
      incomingCancelAtPeriodEnd: false,
      forceRestrict: false,
    }),
    false,
  );
});

test("equal-second cancellation signal applies but duplicate state does not", () => {
  assert.equal(
    shouldApplySubscriptionEvent({
      existingEventCreatedAt: fixtures.equal,
      incomingEventCreatedAt: fixtures.equal,
      existingStatus: "active",
      incomingStatus: "active",
      existingCancelAtPeriodEnd: false,
      incomingCancelAtPeriodEnd: true,
      forceRestrict: false,
    }),
    true,
  );
  assert.equal(
    shouldApplySubscriptionEvent({
      existingEventCreatedAt: fixtures.equal,
      incomingEventCreatedAt: fixtures.equal,
      existingStatus: "past_due",
      incomingStatus: "past_due",
      existingCancelAtPeriodEnd: false,
      incomingCancelAtPeriodEnd: false,
      forceRestrict: true,
    }),
    false,
  );
});

test("past_due, unpaid, canceled, and forced deletion restrict access", () => {
  assert.equal(shouldRestrictSubscription("past_due", false), true);
  assert.equal(shouldRestrictSubscription("unpaid", false), true);
  assert.equal(shouldRestrictSubscription("canceled", false), true);
  assert.equal(shouldRestrictSubscription("active", true), true);
  assert.equal(shouldRestrictSubscription("active", false), false);
  assert.equal(shouldRestrictSubscription("trialing", false), false);
});
