import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type CoursePlanType = "course_plus_6mo_tool" | "tool_renewal_6mo";

const DEFAULT_PLAN_TYPE: CoursePlanType = "course_plus_6mo_tool";

type StripeCheckoutSession = {
  id?: string;
  object?: string;
  amount_total?: number | null;
  currency?: string | null;
  customer?: string | null;
  customer_email?: string | null;
  customer_details?: {
    email?: string | null;
  } | null;
  metadata?: {
    plan_type?: string;
    [key: string]: string | undefined;
  } | null;
  payment_intent?: string | null;
  payment_status?: string | null;
};

type StripeWebhookEvent = {
  id?: string;
  type?: string;
  data?: {
    object?: StripeCheckoutSession;
  };
};

type ExistingPayment = {
  id: string;
  user_id: string | null;
  status: string;
  paid_at: string | null;
};

function parseStripeSignature(signatureHeader: string) {
  return signatureHeader.split(",").reduce(
    (acc, part) => {
      const [key, value] = part.split("=");
      if (key === "t") {
        acc.timestamp = value;
      }
      if (key === "v1") {
        acc.signatures.push(value);
      }
      return acc;
    },
    { timestamp: "", signatures: [] as string[] },
  );
}

function verifyStripeSignature({
  payload,
  signatureHeader,
  webhookSecret,
  toleranceInSeconds = 300,
}: {
  payload: string;
  signatureHeader: string;
  webhookSecret: string;
  toleranceInSeconds?: number;
}) {
  const { timestamp, signatures } = parseStripeSignature(signatureHeader);

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const timestampInSeconds = Number(timestamp);
  const currentTimestampInSeconds = Math.floor(Date.now() / 1000);

  if (
    !Number.isFinite(timestampInSeconds) ||
    Math.abs(currentTimestampInSeconds - timestampInSeconds) >
      toleranceInSeconds
  ) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = createHmac("sha256", webhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  return signatures.some((signature) => {
    const receivedBuffer = Buffer.from(signature, "hex");

    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(receivedBuffer, expectedBuffer);
  });
}

function addMonths(date: Date, months: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

function normalizePlanType(value: string | null | undefined): CoursePlanType {
  if (value === "course_plus_6mo_tool" || value === "tool_renewal_6mo") {
    return value;
  }

  return DEFAULT_PLAN_TYPE;
}

function getSessionEmail(session: StripeCheckoutSession) {
  return (
    session.customer_details?.email?.trim().toLowerCase() ||
    session.customer_email?.trim().toLowerCase() ||
    undefined
  );
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook secret is not configured." },
      { status: 500 },
    );
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("stripe-signature");

  if (!signatureHeader) {
    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 },
    );
  }

  const isValidSignature = verifyStripeSignature({
    payload: rawBody,
    signatureHeader,
    webhookSecret,
  });

  if (!isValidSignature) {
    return NextResponse.json(
      { error: "Invalid Stripe webhook signature." },
      { status: 400 },
    );
  }

  let event: StripeWebhookEvent;

  try {
    event = JSON.parse(rawBody) as StripeWebhookEvent;
  } catch {
    return NextResponse.json(
      { error: "Invalid Stripe webhook payload." },
      { status: 400 },
    );
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, ignored: true });
  }

  const session = event.data?.object;
  const stripeSessionId = session?.id;
  const email = session ? getSessionEmail(session) : undefined;

  if (!session || !stripeSessionId || !email) {
    return NextResponse.json(
      { error: "Missing checkout session id or customer email." },
      { status: 400 },
    );
  }

  const planType = normalizePlanType(session.metadata?.plan_type);
  const paidAt = new Date();
  const supabase = createAdminClient();

  const [{ data: profile, error: profileError }, { data: existingPayment }] =
    await Promise.all([
      supabase.from("profiles").select("id").eq("email", email).maybeSingle(),
      supabase
        .from("payments")
        .select("id,user_id,status,paid_at")
        .eq("stripe_session_id", stripeSessionId)
        .maybeSingle<ExistingPayment>(),
    ]);

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 },
    );
  }

  let paymentId = existingPayment?.id;
  const paymentPaidAt = existingPayment?.paid_at
    ? new Date(existingPayment.paid_at)
    : paidAt;
  const expiresAt = addMonths(paymentPaidAt, 6);

  if (existingPayment && profile && !existingPayment.user_id) {
    const { error: linkPaymentError } = await supabase
      .from("payments")
      .update({ user_id: profile.id })
      .eq("id", existingPayment.id);

    if (linkPaymentError) {
      return NextResponse.json(
        { error: linkPaymentError.message },
        { status: 500 },
      );
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
        raw_webhook_payload: event,
      })
      .select("id")
      .single();

    if (paymentError) {
      return NextResponse.json(
        { error: paymentError.message },
        { status: 500 },
      );
    }

    paymentId = payment.id;
  }

  if (!paymentId) {
    return NextResponse.json(
      { error: "Payment could not be recorded." },
      { status: 500 },
    );
  }

  if (!profile) {
    return NextResponse.json({
      received: true,
      paymentId,
      profileLinked: false,
      message:
        "Payment recorded, but no profile exists for this email. Course access was not granted.",
    });
  }

  const { data: existingAccess, error: existingAccessError } = await supabase
    .from("course_access")
    .select("id,expires_at")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (existingAccessError) {
    return NextResponse.json(
      { error: existingAccessError.message },
      { status: 500 },
    );
  }

  if (existingAccess) {
    return NextResponse.json({
      received: true,
      success: true,
      duplicate: true,
      paymentId,
      accessExpiresAt: existingAccess.expires_at,
    });
  }

  const accessStartsAt = paymentPaidAt.toISOString();
  const accessExpiresAt = expiresAt.toISOString();

  const { error: accessError } = await supabase.from("course_access").insert({
    user_id: profile.id,
    payment_id: paymentId,
    plan_type: planType,
    starts_at: accessStartsAt,
    expires_at: accessExpiresAt,
    is_active: true,
    granted_by: "stripe_webhook",
  });

  if (accessError) {
    return NextResponse.json(
      { error: accessError.message },
      { status: 500 },
    );
  }

  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({
      is_paid: true,
      paid_at: accessStartsAt,
      course_expires_at: accessExpiresAt,
    })
    .eq("id", profile.id);

  if (profileUpdateError) {
    return NextResponse.json(
      { error: profileUpdateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    received: true,
    success: true,
    paymentId,
    accessExpiresAt,
  });
}
