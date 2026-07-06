import { NextRequest, NextResponse } from "next/server";
import { generateInviteCode, hashInviteCode } from "@/lib/labs/invite-code";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { canAccessWorkspace } from "@/lib/workspace/access";
import type { Json } from "@/types/database";

export const runtime = "nodejs";

type CreateInviteBody = {
  labId?: unknown;
  expiresInDays?: unknown;
  maxUses?: unknown;
};

type RevokeInviteBody = {
  labId?: unknown;
  inviteId?: unknown;
};

function jsonError(message: string, status = 400, extra?: Record<string, Json>) {
  return NextResponse.json(
    { success: false, error: message, ...extra },
    { status },
  );
}

function parsePositiveInteger(value: unknown, fallback: number, max: number) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    return null;
  }

  return parsed;
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
    return jsonError("Login is required before creating an invite code.", 401);
  }

  let body: CreateInviteBody;

  try {
    body = (await request.json()) as CreateInviteBody;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (typeof body.labId !== "string" || body.labId.trim().length === 0) {
    return jsonError("labId is required.", 400);
  }

  const expiresInDays = parsePositiveInteger(body.expiresInDays, 14, 90);
  const maxUses = parsePositiveInteger(body.maxUses, 20, 200);

  if (expiresInDays === null) {
    return jsonError("expiresInDays must be an integer from 1 to 90.", 400);
  }

  if (maxUses === null) {
    return jsonError("maxUses must be an integer from 1 to 200.", 400);
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,role")
    .eq("id", user.id)
    .maybeSingle<{ id: string; role: string }>();

  if (profileError) {
    return jsonError(profileError.message, 500);
  }

  if (!canAccessWorkspace(profile?.role, "professor")) {
    return jsonError(
      "Only professor workspace accounts can create invite codes.",
      403,
    );
  }

  const { data: lab, error: labError } = await admin
    .from("labs")
    .select("id,name,owner_professor_id")
    .eq("id", body.labId)
    .eq("owner_professor_id", user.id)
    .maybeSingle<{
      id: string;
      name: string;
      owner_professor_id: string;
    }>();

  if (labError) {
    return jsonError(labError.message, 500);
  }

  if (!lab) {
    return jsonError("Lab not found or not owned by this professor.", 404);
  }

  const inviteCode = generateInviteCode();
  const expiresAt = new Date(
    Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: invite, error: inviteError } = await admin
    .from("lab_invite_codes")
    .insert({
      lab_id: lab.id,
      code_hash: hashInviteCode(inviteCode),
      created_by: user.id,
      expires_at: expiresAt,
      max_uses: maxUses,
    })
    .select("id,lab_id,expires_at,max_uses,used_count,revoked_at,created_at")
    .single();

  if (inviteError) {
    return jsonError(inviteError.message, 500);
  }

  return NextResponse.json({
    success: true,
    inviteCode,
    invite,
    lab: {
      id: lab.id,
      name: lab.name,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return jsonError(userError.message, 401);
  }

  if (!user) {
    return jsonError("Login is required before revoking an invite code.", 401);
  }

  let body: RevokeInviteBody;

  try {
    body = (await request.json()) as RevokeInviteBody;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (typeof body.labId !== "string" || body.labId.trim().length === 0) {
    return jsonError("labId is required.", 400);
  }

  if (typeof body.inviteId !== "string" || body.inviteId.trim().length === 0) {
    return jsonError("inviteId is required.", 400);
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,role")
    .eq("id", user.id)
    .maybeSingle<{ id: string; role: string }>();

  if (profileError) {
    return jsonError(profileError.message, 500);
  }

  if (!canAccessWorkspace(profile?.role, "professor")) {
    return jsonError(
      "Only professor workspace accounts can revoke invite codes.",
      403,
    );
  }

  const { data: ownershipRows, error: ownershipError } = await admin
    .from("labs")
    .select("id")
    .eq("id", body.labId)
    .eq("owner_professor_id", user.id)
    .limit(1)
    .returns<{ id: string }[]>();

  if (ownershipError) {
    return jsonError(ownershipError.message, 500);
  }

  const isOwner = (ownershipRows ?? []).length > 0;

  if (!isOwner) {
    return jsonError("You do not have permission to revoke this invite code.", 403);
  }

  const { data: existingInvite, error: existingInviteError } = await admin
    .from("lab_invite_codes")
    .select("id,lab_id,expires_at,max_uses,used_count,revoked_at,created_at")
    .eq("id", body.inviteId)
    .eq("lab_id", body.labId)
    .maybeSingle();

  if (existingInviteError) {
    return jsonError(existingInviteError.message, 500);
  }

  if (!existingInvite) {
    return jsonError("Invite code was not found.", 404);
  }

  if (existingInvite.revoked_at) {
    return NextResponse.json({
      success: true,
      invite: existingInvite,
      alreadyRevoked: true,
    });
  }

  const revokedAt = new Date().toISOString();
  const { data: invite, error: revokeError } = await admin
    .from("lab_invite_codes")
    .update({
      revoked_at: revokedAt,
    })
    .eq("id", body.inviteId)
    .eq("lab_id", body.labId)
    .select("id,lab_id,expires_at,max_uses,used_count,revoked_at,created_at")
    .maybeSingle();

  if (revokeError) {
    return jsonError(revokeError.message, 500);
  }

  if (!invite) {
    return jsonError("Invite code revoke failed.", 500);
  }

  return NextResponse.json({
    success: true,
    invite,
    alreadyRevoked: false,
  });
}
