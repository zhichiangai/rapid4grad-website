import type { SubscriptionStatus } from "@/types/database";

export function shouldApplySubscriptionEvent({
  existingEventCreatedAt,
  incomingEventCreatedAt,
  existingStatus,
  incomingStatus,
  existingCancelAtPeriodEnd,
  incomingCancelAtPeriodEnd,
  forceRestrict,
}: {
  existingEventCreatedAt: string | null | undefined;
  incomingEventCreatedAt: string;
  existingStatus: SubscriptionStatus | null | undefined;
  incomingStatus: SubscriptionStatus;
  existingCancelAtPeriodEnd: boolean | null | undefined;
  incomingCancelAtPeriodEnd: boolean;
  forceRestrict: boolean;
}) {
  const incoming = new Date(incomingEventCreatedAt).getTime();
  if (!Number.isFinite(incoming)) return false;
  if (!existingEventCreatedAt) return true;
  const existing = new Date(existingEventCreatedAt).getTime();
  if (!Number.isFinite(existing) || incoming > existing) return true;
  if (incoming < existing) return false;

  const existingRestricts = existingStatus
    ? shouldRestrictSubscription(existingStatus, false)
    : false;
  const incomingRestricts = shouldRestrictSubscription(
    incomingStatus,
    forceRestrict,
  );

  // Stripe timestamps are second-granularity. Equal-second events may tighten
  // access, but can never restore access or remove a cancellation signal.
  if (incomingRestricts && !existingRestricts) return true;
  if (incomingCancelAtPeriodEnd && !existingCancelAtPeriodEnd) return true;
  return false;
}

export function shouldRestrictSubscription(
  status: SubscriptionStatus,
  forceRestrict: boolean,
) {
  return (
    forceRestrict ||
    status === "past_due" ||
    status === "unpaid" ||
    status === "canceled"
  );
}
