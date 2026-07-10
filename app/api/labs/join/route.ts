import { NextRequest, NextResponse } from "next/server";
import { hashInviteCode, normalizeInviteCode } from "@/lib/labs/invite-code";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type JoinLabBody = { inviteCode?: unknown };
type JoinLabResult = {
  labId: string;
  labName: string;
  institution: string | null;
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
  if (message.includes("student_role_required")) return jsonError("只有學生帳號可以加入 Lab。", 403);
  if (message.includes("lab_not_found")) return jsonError("這個 Lab 已不存在。", 404);
  return jsonError("目前無法加入 Lab，請稍後再試。", 500);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return jsonError("請先登入學生帳號。", 401);

  const body = await parseBody(request);
  const inviteCode =
    typeof body?.inviteCode === "string"
      ? normalizeInviteCode(body.inviteCode)
      : "";
  if (inviteCode.length < 8 || inviteCode.length > 32 || !/^[A-Z0-9]+$/.test(inviteCode)) {
    return jsonError("請輸入有效的邀請碼。", 400);
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("join_lab_with_invite", {
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
    },
  });
}
