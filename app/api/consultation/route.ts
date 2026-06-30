import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

type ConsultationPayload = {
  name?: unknown;
  email?: unknown;
  lineId?: unknown;
  blocker?: unknown;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONSULTATION_TAG = "tag_consultation_requested";

function normalizeRequiredText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function mergeTags(existingTags: unknown) {
  const tags = Array.isArray(existingTags)
    ? existingTags.filter((tag): tag is string => typeof tag === "string")
    : [];

  return Array.from(new Set([...tags, CONSULTATION_TAG]));
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  let payload: ConsultationPayload;

  try {
    payload = (await request.json()) as ConsultationPayload;
  } catch {
    return badRequest("Invalid JSON payload.");
  }

  const name = normalizeRequiredText(payload.name);
  const email = normalizeEmail(payload.email);
  const lineId = normalizeRequiredText(payload.lineId);
  const blocker = normalizeRequiredText(payload.blocker);

  if (!name) {
    return badRequest("Name is required.");
  }

  if (!EMAIL_PATTERN.test(email)) {
    return badRequest("Valid email is required.");
  }

  if (!lineId) {
    return badRequest("LINE ID is required.");
  }

  if (!blocker) {
    return badRequest("Research blocker is required.");
  }

  const supabase = createAdminClient();

  const { data: existingLead, error: readError } = await supabase
    .from("leads")
    .select("id,main_tags")
    .eq("email", email)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }

  const leadPayload = {
    name,
    email,
    lead_status: "consulted",
    utm_source: "consultation_page",
    utm_medium: "owned_website",
    utm_campaign: "one_on_one_consultation",
    main_tags: mergeTags(existingLead?.main_tags),
    current_year: `LINE: ${lineId} | 卡點: ${blocker}`,
  };

  const query = existingLead
    ? supabase
        .from("leads")
        .update(leadPayload)
        .eq("id", existingLead.id)
        .select("id")
        .single()
    : supabase.from("leads").insert(leadPayload).select("id").single();

  const { data: lead, error: writeError } = await query;

  if (writeError) {
    return NextResponse.json({ error: writeError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    leadId: lead.id,
    mode: existingLead ? "updated" : "created",
  });
}
