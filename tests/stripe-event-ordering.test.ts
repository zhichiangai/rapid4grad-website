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
    }),
    true,
  );
});

test("older and equal Stripe events cannot overwrite newer local state", () => {
  for (const incomingEventCreatedAt of [fixtures.older, fixtures.equal]) {
    assert.equal(
      shouldApplySubscriptionEvent({
        existingEventCreatedAt: fixtures.existing,
        incomingEventCreatedAt,
      }),
      false,
    );
  }
});

test("newer event applies even when subscription period end is unchanged", () => {
  assert.equal(
    shouldApplySubscriptionEvent({
      existingEventCreatedAt: fixtures.existing,
      incomingEventCreatedAt: fixtures.newer,
    }),
    true,
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
