import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
  const email =
    session?.customer_details?.email || session?.customer_email || undefined;

  if (!session || !stripeSessionId || !email) {
    return NextResponse.json(
      { error: "Missing checkout session id or customer email." },
      { status: 400 },
    );
  }

  const planType = session.metadata?.plan_type || "course_plus_6mo_tool";
  const paidAt = new Date();
  const expiresAt = addMonths(paidAt, 6);
  const supabase = createAdminClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 },
    );
  }

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .upsert(
      {
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
      },
      { onConflict: "stripe_session_id" },
    )
    .select("id")
    .single();

  if (paymentError) {
    return NextResponse.json(
      { error: paymentError.message },
      { status: 500 },
    );
  }

  if (!profile) {
    return NextResponse.json({
      received: true,
      paymentId: payment.id,
      profileLinked: false,
      message:
        "Payment recorded, but no profile exists for this email. Course access was not granted.",
    });
  }

  const { data: existingAccess, error: existingAccessError } = await supabase
    .from("course_access")
    .select("id")
    .eq("payment_id", payment.id)
    .maybeSingle();

  if (existingAccessError) {
    return NextResponse.json(
      { error: existingAccessError.message },
      { status: 500 },
    );
  }

  if (!existingAccess) {
    const { error: accessError } = await supabase
      .from("course_access")
      .insert({
        user_id: profile.id,
        payment_id: payment.id,
        plan_type: "course_plus_6mo_tool",
        starts_at: paidAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_active: true,
        granted_by: "stripe_webhook",
      });

    if (accessError) {
      return NextResponse.json(
        { error: accessError.message },
        { status: 500 },
      );
    }
  }

  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({
      is_paid: true,
      paid_at: paidAt.toISOString(),
      course_expires_at: expiresAt.toISOString(),
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
    paymentId: payment.id,
    accessExpiresAt: expiresAt.toISOString(),
  });
}
