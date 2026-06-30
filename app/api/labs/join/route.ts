import { NextRequest, NextResponse } from "next/server";
import { hashInviteCode, normalizeInviteCode } from "@/lib/labs/invite-code";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const runtime = "nodejs";

type JoinLabBody = {
  inviteCode?: unknown;
};

function jsonError(message: string, status = 400, extra?: Record<string, Json>) {
  return NextResponse.json(
    { success: false, error: message, ...extra },
    { status },
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return jsonError(userError.message, 401);
  }

  if (!user) {
    return jsonError("Login is required before joining a lab.", 401);
  }

  let body: JoinLabBody;

  try {
    body = (await request.json()) as JoinLabBody;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (
    typeof body.inviteCode !== "string" ||
    normalizeInviteCode(body.inviteCode).length < 8
  ) {
    return jsonError("A valid invite code is required.", 400);
  }

  const admin = createAdminClient();
  const codeHash = hashInviteCode(body.inviteCode);
  const { data: invite, error: inviteError } = await admin
    .from("lab_invite_codes")
    .select("lab_id")
    .eq("code_hash", codeHash)
    .maybeSingle<{
      lab_id: string;
    }>();

  if (inviteError) {
    return jsonError(inviteError.message, 500);
  }

  if (!invite) {
    return jsonError("Invite code was not found.", 404);
  }

  const { data: lab, error: labError } = await admin
    .from("labs")
    .select("id,name,institution")
    .eq("id", invite.lab_id)
    .maybeSingle<{
      id: string;
      name: string;
      institution: string | null;
    }>();

  if (labError) {
    return jsonError(labError.message, 500);
  }

  if (!lab) {
    return jsonError("The invite lab no longer exists.", 404);
  }

  const { data: existingMembership, error: existingError } = await admin
    .from("lab_memberships")
    .select("id,status,role")
    .eq("lab_id", invite.lab_id)
    .eq("user_id", user.id)
    .maybeSingle<{
      id: string;
      status: string;
      role: string;
    }>();

  if (existingError) {
    return jsonError(existingError.message, 500);
  }

  if (existingMembership?.status === "active") {
    return NextResponse.json({
      success: true,
      alreadyJoined: true,
      lab,
    });
  }

  const { error: membershipError } = await admin
    .from("lab_memberships")
    .upsert(
      {
        lab_id: invite.lab_id,
        user_id: user.id,
        role: "student",
        status: "active",
      },
      { onConflict: "lab_id,user_id" },
    );

  if (membershipError) {
    return jsonError(membershipError.message, 500);
  }

  const { error: usageError } = await admin.rpc("increment_invite_code_usage", {
    target_hash: codeHash,
  });

  if (usageError) {
    if (usageError.message === "Invite code has been revoked.") {
      return jsonError(usageError.message, 410);
    }

    if (usageError.message === "Invite code has expired.") {
      return jsonError(usageError.message, 410);
    }

    if (usageError.message === "Invite code has reached its usage limit.") {
      return jsonError(usageError.message, 409);
    }

    if (usageError.message === "Invite code was not found.") {
      return jsonError(usageError.message, 404);
    }

    return jsonError(usageError.message, 500);
  }

  return NextResponse.json({
    success: true,
    alreadyJoined: false,
    lab,
  });
}
