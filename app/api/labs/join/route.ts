import { NextRequest, NextResponse } from "next/server";
import { hashInviteCode, normalizeInviteCode } from "@/lib/labs/invite-code";
import { createV2AdminClient, createV2Client } from "@/lib/supabase/server";
import type { LabRole } from "@/types/database";

export const runtime = "nodejs";

type JoinLabBody = { inviteCode?: unknown };
type JoinLabResult = {
  labId: string;
  labName: string;
  institution: string | null;
  role: LabRole;
  alreadyJoined: boolean;
};

const BODY_LIMIT_BYTES = 2048;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function parseBody(request: NextRequest): Promise<JoinLabBody | null> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > BODY_LIMIT_BYTES) return null;
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > BODY_LIMIT_BYTES) return null;
  try {
    return JSON.parse(raw) as JoinLabBody;
  } catch {
    return null;
  }
}

function mapJoinError(message: string) {
  if (message.includes("invite_not_found")) return jsonError("找不到這組邀請碼。", 404);
  if (message.includes("invite_revoked")) return jsonError("這組邀請碼已撤銷。", 410);
  if (message.includes("invite_expired")) return jsonError("這組邀請碼已過期。", 410);
  if (message.includes("invite_limit_reached")) return jsonError("這組邀請碼已達使用上限。", 409);
  if (message.includes("student_profile_role_required")) {
    return jsonError("這組邀請碼只適用於學生帳號。", 403);
  }
  if (message.includes("professor_profile_role_required")) {
    return jsonError("這組邀請碼只適用於 Professor 帳號。", 403);
  }
  if (message.includes("active_lab_not_found")) {
    return jsonError("這個 Lab 已不存在或停止使用。", 404);
  }
  if (message.includes("active_lab_subscription_required")) {
    return jsonError("此 Lab 目前不是可加入狀態。", 409);
  }
  if (message.includes("student_seat_limit_reached")) {
    return jsonError("此方案的學生席位已滿，請聯絡 Professor 升級方案。", 409);
  }
  if (message.includes("assistant_limit_reached")) {
    return jsonError("此 Lab 已達 3 位 assistant 上限。", 409);
  }
  if (message.includes("lab_memberships_one_active_lab_per_student_unique")) {
    return jsonError("你已加入另一個 Lab，請先離開或由原 Lab owner 移除。", 409);
  }
  return jsonError("目前無法加入 Lab，請稍後再試。", 500);
}

export async function POST(request: NextRequest) {
  const supabase = await createV2Client();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return jsonError("請先登入帳號。", 401);

  const body = await parseBody(request);
  const inviteCode =
    typeof body?.inviteCode === "string"
      ? normalizeInviteCode(body.inviteCode)
      : "";
  if (inviteCode.length < 8 || inviteCode.length > 32 || !/^[A-Z0-9]+$/.test(inviteCode)) {
    return jsonError("請輸入有效的邀請碼。", 400);
  }

  const admin = createV2AdminClient();
  const { data, error } = await admin.rpc("redeem_lab_invite", {
    target_hash: hashInviteCode(inviteCode),
    target_user_id: user.id,
  });

  if (error) {
    console.error("[labs-join] Atomic invite redemption failed", {
      code: error.code,
    });
    return mapJoinError(error.message);
  }

  const result = data as JoinLabResult;
  return NextResponse.json({
    success: true,
    alreadyJoined: result.alreadyJoined,
    lab: {
      id: result.labId,
      name: result.labName,
      institution: result.institution,
      role: result.role,
    },
  });
}
