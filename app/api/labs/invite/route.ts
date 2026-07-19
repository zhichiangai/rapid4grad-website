import { NextRequest, NextResponse } from "next/server";
import { generateInviteCode, hashInviteCode } from "@/lib/labs/invite-code";
import { createV2AdminClient, createV2Client } from "@/lib/supabase/server";
import type { LabRole } from "@/types/database";

export const runtime = "nodejs";

type CreateInviteBody = {
  labId?: unknown;
  intendedRole?: unknown;
  expiresInDays?: unknown;
  maxUses?: unknown;
};

type RevokeInviteBody = {
  labId?: unknown;
  inviteId?: unknown;
};

const BODY_LIMIT_BYTES = 4096;
const INVITE_ROLES = new Set<LabRole>(["student", "professor", "assistant"]);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function parseBody<T>(request: NextRequest): Promise<T | null> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > BODY_LIMIT_BYTES) return null;

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > BODY_LIMIT_BYTES) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function parsePositiveInteger(value: unknown, fallback: number, max: number) {
  if (value === undefined || value === null || value === "") return fallback;

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= max
    ? parsed
    : null;
}

function parseInviteRole(value: unknown): LabRole | null {
  const role = typeof value === "string" ? (value as LabRole) : "student";
  return INVITE_ROLES.has(role) ? role : null;
}

function mapInviteMutationError(message: string) {
  if (message.includes("lab_owner_required")) {
    return jsonError("只有 Lab owner 可以管理邀請碼。", 403);
  }
  if (message.includes("active_lab_subscription_required")) {
    return jsonError("目前訂閱不是可操作狀態，無法建立邀請碼。", 409);
  }
  if (message.includes("invite_expiry_must_be_future")) {
    return jsonError("邀請碼到期時間必須晚於現在。", 400);
  }
  if (message.includes("lab_owner_or_invite_not_found")) {
    return jsonError("找不到邀請碼，或你沒有管理權限。", 404);
  }
  return jsonError("目前無法管理邀請碼，請稍後再試。", 503);
}

async function requireProfessorOwnerAccount() {
  const supabase = await createV2Client();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: jsonError("請先登入 Professor 帳號。", 401) } as const;
  }

  const admin = createV2AdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role,account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[labs-invite] Professor profile lookup failed", {
      code: profileError.code,
    });
    return { error: jsonError("目前無法驗證 Professor 帳號。", 503) } as const;
  }

  if (profile?.role !== "professor" || profile.account_status !== "active") {
    return { error: jsonError("只有啟用中的 Professor 帳號可以管理邀請碼。", 403) } as const;
  }

  return { user, admin } as const;
}

export async function POST(request: NextRequest) {
  const auth = await requireProfessorOwnerAccount();
  if ("error" in auth) return auth.error;

  const body = await parseBody<CreateInviteBody>(request);
  if (!body) return jsonError("請求格式不正確。", 400);

  const labId = typeof body.labId === "string" ? body.labId.trim() : "";
  const intendedRole = parseInviteRole(body.intendedRole);
  const expiresInDays = parsePositiveInteger(body.expiresInDays, 14, 90);
  const maxUses = parsePositiveInteger(body.maxUses, 20, 200);

  if (!labId) return jsonError("請選擇 Lab。", 400);
  if (!intendedRole) return jsonError("邀請角色不正確。", 400);
  if (expiresInDays === null) {
    return jsonError("有效天數必須是 1 至 90 的整數。", 400);
  }
  if (maxUses === null) {
    return jsonError("可用次數必須是 1 至 200 的整數。", 400);
  }

  const inviteCode = generateInviteCode();
  const expiresAt = new Date(
    Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data: inviteId, error: inviteError } = await auth.admin.rpc(
    "create_lab_invite",
    {
      target_actor_id: auth.user.id,
      target_lab_id: labId,
      target_hash: hashInviteCode(inviteCode),
      target_role: intendedRole,
      target_expires_at: expiresAt,
      target_max_uses: maxUses,
    },
  );

  if (inviteError) {
    console.error("[labs-invite] Invite creation failed", {
      code: inviteError.code,
    });
    return mapInviteMutationError(inviteError.message);
  }

  const { data: invite, error: readError } = await auth.admin
    .from("lab_invite_codes")
    .select(
      "id,lab_id,intended_role,expires_at,max_uses,used_count,revoked_at,created_at",
    )
    .eq("id", inviteId)
    .single();

  if (readError) {
    console.error("[labs-invite] Created invite lookup failed", {
      code: readError.code,
    });
    return jsonError("邀請碼已建立，但目前無法讀取結果。", 503);
  }

  const { data: lab, error: labError } = await auth.admin
    .from("labs")
    .select("id,name")
    .eq("id", labId)
    .eq("owner_professor_id", auth.user.id)
    .single();

  if (labError) {
    console.error("[labs-invite] Owned Lab lookup failed", { code: labError.code });
    return jsonError("邀請碼已建立，但目前無法讀取 Lab。", 503);
  }

  return NextResponse.json({ success: true, inviteCode, invite, lab });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireProfessorOwnerAccount();
  if ("error" in auth) return auth.error;

  const body = await parseBody<RevokeInviteBody>(request);
  if (!body) return jsonError("請求格式不正確。", 400);

  const labId = typeof body.labId === "string" ? body.labId.trim() : "";
  const inviteId =
    typeof body.inviteId === "string" ? body.inviteId.trim() : "";
  if (!labId || !inviteId) {
    return jsonError("labId 與 inviteId 都是必填欄位。", 400);
  }

  const { data: existingInvite, error: readError } = await auth.admin
    .from("lab_invite_codes")
    .select(
      "id,lab_id,intended_role,expires_at,max_uses,used_count,revoked_at,created_at",
    )
    .eq("id", inviteId)
    .eq("lab_id", labId)
    .maybeSingle();

  if (readError) {
    console.error("[labs-invite] Invite lookup failed", { code: readError.code });
    return jsonError("目前無法讀取邀請碼。", 503);
  }
  if (!existingInvite) return jsonError("找不到邀請碼。", 404);
  if (existingInvite.revoked_at) {
    return NextResponse.json({
      success: true,
      invite: existingInvite,
      alreadyRevoked: true,
    });
  }

  const { error: revokeError } = await auth.admin.rpc("revoke_lab_invite", {
    target_actor_id: auth.user.id,
    target_invite_id: inviteId,
  });

  if (revokeError) {
    console.error("[labs-invite] Invite revoke failed", {
      code: revokeError.code,
    });
    return mapInviteMutationError(revokeError.message);
  }

  const { data: invite, error: refreshedError } = await auth.admin
    .from("lab_invite_codes")
    .select(
      "id,lab_id,intended_role,expires_at,max_uses,used_count,revoked_at,created_at",
    )
    .eq("id", inviteId)
    .eq("lab_id", labId)
    .single();

  if (refreshedError) {
    console.error("[labs-invite] Revoked invite lookup failed", {
      code: refreshedError.code,
    });
    return jsonError("邀請碼已撤銷，但目前無法讀取結果。", 503);
  }

  return NextResponse.json({ success: true, invite, alreadyRevoked: false });
}
