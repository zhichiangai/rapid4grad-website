import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  getBillingPlanByPriceId,
  getInvoicePeriod,
  retrieveStripeSubscription,
  unixSecondsToIso,
  verifyStripeSignature,
  type StripeCheckoutSession,
  type StripeEvent,
  type StripeInvoice,
  type StripeSubscription,
} from "@/lib/stripe/server";
import { getBillingPlan } from "@/lib/stripe/plans";
import {
  shouldApplySubscriptionEvent,
  shouldRestrictSubscription,
} from "@/lib/stripe/event-ordering";
import type {
  CoursePlanType,
  Json,
  SubscriptionPlanKey,
  SubscriptionStatus,
} from "@/types/database";

export const runtime = "nodejs";

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

type ExistingPayment = {
  id: string;
  user_id: string | null;
  status: string;
  paid_at: string | null;
};

type ProfileLookup = {
  id: string;
  email: string;
};

type ExistingSubscription = {
  id: string;
  user_id: string;
  current_period_end: string;
  last_stripe_event_created_at: string | null;
  status: SubscriptionStatus;
  cancel_at_period_end: boolean;
};

const DEFAULT_PLAN_TYPE: CoursePlanType = "course_plus_6mo_tool";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ received: false, error: message }, { status });
}

function addMonths(date: Date, months: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

function normalizeCoursePlanType(
  value: string | null | undefined,
): CoursePlanType {
  if (value === "course_plus_6mo_tool" || value === "tool_renewal_6mo") {
    return value;
  }

  return DEFAULT_PLAN_TYPE;
}

function normalizeSubscriptionStatus(
  value: string | null | undefined,
): SubscriptionStatus {
  if (
    value === "active" ||
    value === "trialing" ||
    value === "past_due" ||
    value === "canceled" ||
    value === "unpaid"
  ) {
    return value;
  }

  return "unpaid";
}

function normalizePlanKey(
  value: string | null | undefined,
  priceId: string | null | undefined,
): SubscriptionPlanKey | null {
  const planFromMetadata = value ? getBillingPlan(value) : null;

  if (planFromMetadata) {
    return planFromMetadata.key;
  }

  return getBillingPlanByPriceId(priceId)?.key ?? null;
}

function getSessionEmail(session: StripeCheckoutSession) {
  return (
    session.customer_details?.email?.trim().toLowerCase() ||
    session.customer_email?.trim().toLowerCase() ||
    undefined
  );
}

function toRecord(value: Json): Record<string, Json> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, Json>;
  }

  return {};
}

function asCheckoutSession(value: Json): StripeCheckoutSession {
  return toRecord(value) as StripeCheckoutSession;
}

function asSubscription(value: Json): StripeSubscription {
  return toRecord(value) as StripeSubscription;
}

function asInvoice(value: Json): StripeInvoice {
  return toRecord(value) as StripeInvoice;
}

function stripeEventCreatedAt(event: StripeEvent) {
  const seconds = event.created;
  return typeof seconds === "number" && Number.isFinite(seconds)
    ? new Date(seconds * 1000).toISOString()
    : new Date().toISOString();
}

async function claimStripeEvent(
  supabase: SupabaseAdminClient,
  event: StripeEvent,
) {
  const { data, error } = await supabase.rpc("claim_stripe_event", {
    target_event_id: event.id,
    target_event_type: event.type,
    target_event_created_at: stripeEventCreatedAt(event),
    target_payload: event as unknown as Json,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

async function finishStripeEvent(
  supabase: SupabaseAdminClient,
  eventId: string,
  succeeded: boolean,
  message?: string,
) {
  const { error } = await supabase.rpc("finish_stripe_event", {
    target_event_id: eventId,
    succeeded,
    failure_message: message?.slice(0, 500) ?? null,
  });
  if (error) throw new Error(error.message);
}

async function grantCourseAccessForOneTimePayment({
  supabase,
  profile,
  paymentId,
  planType,
  paymentPaidAt,
}: {
  supabase: SupabaseAdminClient;
  profile: ProfileLookup;
  paymentId: string;
  planType: CoursePlanType;
  paymentPaidAt: Date;
}) {
  const { data: existingAccess, error: existingAccessError } = await supabase
    .from("course_access")
    .select("id,expires_at")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (existingAccessError) {
    throw new Error(existingAccessError.message);
  }

  if (existingAccess) {
    return existingAccess.expires_at;
  }

  const startsAt = paymentPaidAt.toISOString();
  const expiresAt = addMonths(paymentPaidAt, 6).toISOString();

  const { error: accessError } = await supabase.from("course_access").insert({
    user_id: profile.id,
    payment_id: paymentId,
    plan_type: planType,
    starts_at: startsAt,
    expires_at: expiresAt,
    is_active: true,
    granted_by: "stripe_webhook",
  });

  if (accessError) {
    throw new Error(accessError.message);
  }

  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({
      is_paid: true,
      paid_at: startsAt,
      course_expires_at: expiresAt,
    })
    .eq("id", profile.id);

  if (profileUpdateError) {
    throw new Error(profileUpdateError.message);
  }

  return expiresAt;
}

async function processOneTimeCheckoutSession(
  supabase: SupabaseAdminClient,
  event: StripeEvent,
  session: StripeCheckoutSession,
) {
  const stripeSessionId = session.id;
  const email = getSessionEmail(session);

  if (!stripeSessionId || !email) {
    throw new Error("Missing checkout session id or customer email.");
  }

  const planType = normalizeCoursePlanType(session.metadata?.plan_type);
  const paidAt = new Date();
  const [{ data: profile, error: profileError }, { data: existingPayment }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id,email")
        .eq("email", email)
        .maybeSingle<ProfileLookup>(),
      supabase
        .from("payments")
        .select("id,user_id,status,paid_at")
        .eq("stripe_session_id", stripeSessionId)
        .maybeSingle<ExistingPayment>(),
    ]);

  if (profileError) {
    throw new Error(profileError.message);
  }

  let paymentId = existingPayment?.id;
  const paymentPaidAt = existingPayment?.paid_at
    ? new Date(existingPayment.paid_at)
    : paidAt;

  if (existingPayment && profile && !existingPayment.user_id) {
    const { error: linkPaymentError } = await supabase
      .from("payments")
      .update({ user_id: profile.id })
      .eq("id", existingPayment.id);

    if (linkPaymentError) {
      throw new Error(linkPaymentError.message);
    }
  }

  if (!existingPayment) {
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: profile?.id ?? null,
        email,
        stripe_session_id: stripeSessionId,
        stripe_payment_intent: session.payment_intent ?? null,
        stripe_customer_id: session.customer ?? null,
        amount: session.amount_total ?? 0,
        currency: session.currency ?? "twd",
        plan_type: planType,
        status: "completed",
        paid_at: paidAt.toISOString(),
        raw_webhook_payload: event as unknown as Json,
      })
      .select("id")
      .single();

    if (paymentError) {
      throw new Error(paymentError.message);
    }

    paymentId = payment.id;
  }

  if (!paymentId || !profile) {
    return;
  }

  await grantCourseAccessForOneTimePayment({
    supabase,
    profile,
    paymentId,
    planType,
    paymentPaidAt,
  });
}

async function findUserIdForSubscription(
  supabase: SupabaseAdminClient,
  subscription: StripeSubscription,
  fallbackUserId?: string | null,
) {
  if (fallbackUserId) {
    return fallbackUserId;
  }

  const { data: existing, error } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle<{ user_id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  return existing?.user_id ?? null;
}

async function upsertSubscriptionItems({
  supabase,
  localSubscriptionId,
  subscription,
}: {
  supabase: SupabaseAdminClient;
  localSubscriptionId: string;
  subscription: StripeSubscription;
}) {
  const items = subscription.items?.data ?? [];

  for (const item of items) {
    if (!item.id || !item.price?.id) {
      continue;
    }

    const { error } = await supabase.from("subscription_items").upsert(
      {
        subscription_id: localSubscriptionId,
        stripe_subscription_item_id: item.id,
        stripe_price_id: item.price.id,
        quantity: item.quantity ?? 1,
        plan_feature_key: "ai_audit",
      },
      { onConflict: "stripe_subscription_item_id" },
    );

    if (error) {
      throw new Error(error.message);
    }
  }
}

async function ensureAiUsageCredits({
  supabase,
  userId,
  localSubscriptionId,
  planKey,
  periodStart,
  periodEnd,
  shouldRestrict,
}: {
  supabase: SupabaseAdminClient;
  userId: string;
  localSubscriptionId: string;
  planKey: SubscriptionPlanKey;
  periodStart: string;
  periodEnd: string;
  shouldRestrict: boolean;
}) {
  const { data: existingCredit, error: existingCreditError } = await supabase
    .from("ai_usage_credits")
    .select("id,credits_used,pdf_audit_used")
    .eq("subscription_id", localSubscriptionId)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .maybeSingle();

  if (existingCreditError) {
    throw new Error(existingCreditError.message);
  }

  if (existingCredit) {
    const plan = getBillingPlan(planKey);
    const { error } = await supabase
      .from("ai_usage_credits")
      .update({
        monthly_credit_limit: shouldRestrict
          ? existingCredit.credits_used
          : Math.max(plan?.monthlyCreditLimit ?? 0, existingCredit.credits_used),
        pdf_audit_limit: shouldRestrict
          ? existingCredit.pdf_audit_used
          : Math.max(plan?.pdfAuditLimit ?? 0, existingCredit.pdf_audit_used),
      })
      .eq("id", existingCredit.id);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const plan = getBillingPlan(planKey);
  const { error } = await supabase.from("ai_usage_credits").insert({
    user_id: userId,
    subscription_id: localSubscriptionId,
    period_start: periodStart,
    period_end: periodEnd,
    monthly_credit_limit: shouldRestrict ? 0 : (plan?.monthlyCreditLimit ?? 0),
    credits_used: 0,
    pdf_audit_limit: shouldRestrict ? 0 : (plan?.pdfAuditLimit ?? 0),
    pdf_audit_used: 0,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function syncSubscriptionFromStripe({
  supabase,
  subscription,
  event,
  fallbackUserId,
  forceRestrictCredits = false,
}: {
  supabase: SupabaseAdminClient;
  subscription: StripeSubscription;
  event: StripeEvent;
  fallbackUserId?: string | null;
  forceRestrictCredits?: boolean;
}) {
  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
  const planKey = normalizePlanKey(subscription.metadata?.plan_key, priceId);

  if (!planKey || !subscription.customer || !priceId) {
    return { skipped: true, reason: "Missing plan, customer, or price." };
  }

  const userId = await findUserIdForSubscription(
    supabase,
    subscription,
    fallbackUserId,
  );

  if (!userId) {
    return { skipped: true, reason: "No matching RAPID profile user." };
  }

  const currentPeriodStart = unixSecondsToIso(
    subscription.current_period_start,
  );
  const currentPeriodEnd = unixSecondsToIso(subscription.current_period_end);
  const incomingEventCreatedAt = stripeEventCreatedAt(event);
  const incomingStatus = normalizeSubscriptionStatus(subscription.status);
  const incomingCancelAtPeriodEnd = subscription.cancel_at_period_end ?? false;

  const { data: existingSubscription, error: existingSubscriptionError } =
    await supabase
      .from("subscriptions")
      .select("id,user_id,current_period_end,last_stripe_event_created_at,status,cancel_at_period_end")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle<ExistingSubscription>();

  if (existingSubscriptionError) {
    throw new Error(existingSubscriptionError.message);
  }

  if (
    existingSubscription &&
    !shouldApplySubscriptionEvent({
      existingEventCreatedAt:
        existingSubscription.last_stripe_event_created_at,
      incomingEventCreatedAt,
      existingStatus: existingSubscription.status,
      incomingStatus,
      existingCancelAtPeriodEnd: existingSubscription.cancel_at_period_end,
      incomingCancelAtPeriodEnd,
      forceRestrict: forceRestrictCredits,
    })
  ) {
    return { skipped: true, reason: "Stale subscription event." };
  }

  const { data: localSubscription, error: subscriptionUpsertError } =
    await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          stripe_customer_id: subscription.customer,
          stripe_subscription_id: subscription.id,
          status: incomingStatus,
          price_id: priceId,
          plan_key: planKey,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: incomingCancelAtPeriodEnd,
          last_stripe_event_created_at: incomingEventCreatedAt,
          last_stripe_event_id: event.id,
        },
        { onConflict: "stripe_subscription_id" },
      )
      .select("id")
      .single();

  if (subscriptionUpsertError) {
    throw new Error(subscriptionUpsertError.message);
  }

  await upsertSubscriptionItems({
    supabase,
    localSubscriptionId: localSubscription.id,
    subscription,
  });

  await ensureAiUsageCredits({
    supabase,
    userId,
    localSubscriptionId: localSubscription.id,
    planKey,
    periodStart: currentPeriodStart,
    periodEnd: currentPeriodEnd,
    shouldRestrict: shouldRestrictSubscription(
      incomingStatus,
      forceRestrictCredits,
    ),
  });

  return { skipped: false, subscriptionId: localSubscription.id };
}

async function handleCheckoutSessionCompleted(
  supabase: SupabaseAdminClient,
  event: StripeEvent,
) {
  const session = asCheckoutSession(event.data.object);

  if (session.mode === "subscription" && session.subscription) {
    const subscription = await retrieveStripeSubscription(session.subscription);
    await syncSubscriptionFromStripe({
      supabase,
      subscription,
      event,
      fallbackUserId: session.client_reference_id ?? session.metadata?.user_id,
    });
    return;
  }

  await processOneTimeCheckoutSession(supabase, event, session);
}

async function handleSubscriptionEvent(
  supabase: SupabaseAdminClient,
  event: StripeEvent,
) {
  const subscription = asSubscription(event.data.object);
  await syncSubscriptionFromStripe({
    supabase,
    subscription:
      event.type === "customer.subscription.deleted"
        ? { ...subscription, status: "canceled" }
        : subscription,
    event,
    forceRestrictCredits:
      event.type === "customer.subscription.deleted" ||
      normalizeSubscriptionStatus(subscription.status) === "past_due" ||
      normalizeSubscriptionStatus(subscription.status) === "unpaid",
  });
}

async function handleInvoiceEvent(
  supabase: SupabaseAdminClient,
  event: StripeEvent,
) {
  const invoice = asInvoice(event.data.object);

  if (!invoice.subscription) {
    return;
  }

  const subscription = await retrieveStripeSubscription(invoice.subscription);
  const period = getInvoicePeriod(invoice);
  const invoicePeriodEndMs = new Date(unixSecondsToIso(period.end)).getTime();
  const subscriptionPeriodEndMs = new Date(
    unixSecondsToIso(subscription.current_period_end),
  ).getTime();

  if (invoicePeriodEndMs > subscriptionPeriodEndMs) {
    subscription.current_period_start = period.start;
    subscription.current_period_end = period.end;
  }

  await syncSubscriptionFromStripe({
    supabase,
    event,
    subscription: {
      ...subscription,
      status:
        event.type === "invoice.payment_failed"
          ? "past_due"
          : subscription.status,
    },
    forceRestrictCredits: event.type === "invoice.payment_failed",
  });
}

async function processStripeEvent(
  supabase: SupabaseAdminClient,
  event: StripeEvent,
) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(supabase, event);
      return { handled: true };
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await handleSubscriptionEvent(supabase, event);
      return { handled: true };
    case "invoice.paid":
    case "invoice.payment_failed":
      await handleInvoiceEvent(supabase, event);
      return { handled: true };
    default:
      return { handled: false };
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return jsonError("Stripe webhook secret is not configured.", 500);
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("stripe-signature");

  if (!signatureHeader) {
    return jsonError("Missing stripe-signature header.", 400);
  }

  const isValidSignature = verifyStripeSignature({
    payload: rawBody,
    signatureHeader,
    webhookSecret,
  });

  if (!isValidSignature) {
    return jsonError("Invalid Stripe webhook signature.", 400);
  }

  let event: StripeEvent;

  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return jsonError("Invalid Stripe webhook payload.", 400);
  }

  if (!event.id || !event.type || !event.data?.object) {
    return jsonError("Stripe event is missing id, type, or data.object.", 400);
  }

  const supabase = createAdminClient();
  let claimed = false;

  try {
    claimed = await claimStripeEvent(supabase, event);

    if (!claimed) {
      return NextResponse.json({
        received: true,
        duplicate: true,
        eventId: event.id,
      });
    }

    const result = await processStripeEvent(supabase, event);
    await finishStripeEvent(supabase, event.id, true);

    return NextResponse.json({
      received: true,
      eventId: event.id,
      eventType: event.type,
      handled: result.handled,
    });
  } catch (error) {
    console.error("[stripe-webhook] Event processing failed", {
      eventId: event.id,
      eventType: event.type,
      name: error instanceof Error ? error.name : "UnknownError",
    });
    if (claimed) {
      try {
        await finishStripeEvent(
          supabase,
          event.id,
          false,
          error instanceof Error ? error.message : "Stripe webhook failed.",
        );
      } catch (finishError) {
        console.error("[stripe-webhook] Failed to mark event failure", {
          name:
            finishError instanceof Error ? finishError.name : "UnknownError",
        });
      }
    }
    return jsonError("Stripe webhook processing failed.", 500);
  }
}
