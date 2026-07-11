import type { SubscriptionStatus } from "@/types/database";

export function shouldApplySubscriptionEvent({
  existingEventCreatedAt,
  incomingEventCreatedAt,
}: {
  existingEventCreatedAt: string | null | undefined;
  incomingEventCreatedAt: string;
}) {
  const incoming = new Date(incomingEventCreatedAt).getTime();
  if (!Number.isFinite(incoming)) return false;
  if (!existingEventCreatedAt) return true;
  const existing = new Date(existingEventCreatedAt).getTime();
  return !Number.isFinite(existing) || incoming > existing;
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
