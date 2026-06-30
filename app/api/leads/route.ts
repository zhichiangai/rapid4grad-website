import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

interface LeadPayload {
  email?: unknown;
  name?: unknown;
  utmSource?: unknown;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: NextRequest) {
  let payload: LeadPayload;

  try {
    payload = (await request.json()) as LeadPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const email =
    typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { error: "Valid email is required." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const name = normalizeOptionalText(payload.name);
  const utmSource = normalizeOptionalText(payload.utmSource);

  const { data: existingLead, error: readError } = await supabase
    .from("leads")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }

  if (existingLead) {
    const updates: { name?: string; utm_source?: string } = {};

    if (name) {
      updates.name = name;
    }

    if (utmSource) {
      updates.utm_source = utmSource;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("leads")
        .update(updates)
        .eq("id", existingLead.id);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      leadId: existingLead.id,
      mode: "existing",
    });
  }

  const { data: lead, error: insertError } = await supabase
    .from("leads")
    .insert({
      email,
      name,
      utm_source: utmSource,
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ leadId: lead.id, mode: "created" });
}
