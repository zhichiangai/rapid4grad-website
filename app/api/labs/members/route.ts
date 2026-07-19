import { NextRequest, NextResponse } from "next/server";
import { createV2AdminClient, createV2Client } from "@/lib/supabase/server";
import type { LabRole } from "@/types/database";

export const runtime = "nodejs";

type MemberActionBody = {
  action?: unknown;
  labId?: unknown;
  memberUserId?: unknown;
  reason?: unknown;
  role?: unknown;
};

const BODY_LIMIT_BYTES = 8192;
const STAFF_ROLES = new Set<LabRole>(["professor", "assistant"]);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function parseBody(request: NextRequest): Promise<MemberActionBody | null> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > BODY_LIMIT_BYTES) return null;

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > BODY_LIMIT_BYTES) return null;

  try {
    return JSON.parse(raw) as MemberActionBody;
  } catch {
    return null;
  }
}

function mapMemberMutationError(message: string) {
  if (message.includes("lab_owner_cannot_be_removed")) {
    return jsonError("Lab owner 不可移除自己或轉移 ownership。", 409);
  }
  if (message.includes("lab_owner_role_cannot_change")) {
    return jsonError("Lab owner 的角色不可在成員管理中變更。", 409);
  }
  if (message.includes("lab_owner_required")) {
    return jsonError("只有此 Lab 的 owner 可以執行這項操作。", 403);
  }
  if (message.includes("active_lab_subscription_required")) {
    return jsonError("目前訂閱是唯讀狀態，無法修改成員。", 409);
  }
  if (message.includes("lab_membership_not_found")) {
    return jsonError("找不到這筆 Lab membership。", 404);
  }
  if (message.includes("active_lab_membership_not_found")) {
    return jsonError("只有 active member 可以變更角色。", 409);
  }
  if (message.includes("student_membership_role_is_fixed")) {
    return jsonError("Student membership 不可改成 Professor 或 assistant。", 409);
  }
  if (message.includes("assistant_limit_reached")) {
    return jsonError("此 Lab 已達 3 位 active assistant 上限。", 409);
  }
  if (message.includes("removal_reason_invalid")) {
    return jsonError("移除原因必須是 3 至 500 個字元。", 400);
  }
  return jsonError("目前無法修改 Lab 成員，請稍後再試。", 503);
}

function seatLimitForPlan(planKey: string | null | undefined) {
  if (planKey === "professor_lab_standard") return 15;
  if (planKey === "professor_lab_plus") return 30;
  if (planKey === "professor_lab_enterprise") return null;
  return 0;
}

async function getSeatUsage(
  admin: ReturnType<typeof createV2AdminClient>,
  labId: string,
) {
  const [{ count: activeStudents }, { count: activeAssistants }, subscription] =
    await Promise.all([
      admin
        .from("lab_memberships")
        .select("id", { count: "exact", head: true })
        .eq("lab_id", labId)
        .eq("role", "student")
        .eq("status", "active"),
      admin
        .from("lab_memberships")
        .select("id", { count: "exact", head: true })
        .eq("lab_id", labId)
        .eq("role", "assistant")
        .eq("status", "active"),
      admin
        .from("subscriptions")
        .select("plan_key")
        .eq("lab_id", labId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  return {
    activeStudents: activeStudents ?? 0,
    studentLimit: seatLimitForPlan(subscription.data?.plan_key),
    activeAssistants: activeAssistants ?? 0,
    assistantLimit: 3,
  };
}

export async function PATCH(request: NextRequest) {
  const supabase = await createV2Client();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return jsonError("請先登入 Professor 帳號。", 401);

  const body = await parseBody(request);
  if (!body) return jsonError("請求格式不正確。", 400);

  const action = typeof body.action === "string" ? body.action : "";
  const labId = typeof body.labId === "string" ? body.labId.trim() : "";
  const memberUserId =
    typeof body.memberUserId === "string" ? body.memberUserId.trim() : "";
  if (!labId || !memberUserId) {
    return jsonError("labId 與 memberUserId 都是必填欄位。", 400);
  }

  const admin = createV2AdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role,account_status")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("[lab-members] Professor profile lookup failed", {
      code: profileError.code,
    });
    return jsonError("目前無法驗證 Professor 帳號。", 503);
  }
  if (profile?.role !== "professor" || profile.account_status !== "active") {
    return jsonError("只有啟用中的 Professor 帳號可以修改成員。", 403);
  }

  if (action === "remove") {
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (reason.length < 3 || reason.length > 500) {
      return jsonError("移除原因必須是 3 至 500 個字元。", 400);
    }

    const { error } = await admin.rpc("remove_lab_member", {
      target_actor_id: user.id,
      target_lab_id: labId,
      target_member_user_id: memberUserId,
      target_reason: reason,
    });
    if (error) {
      console.error("[lab-members] Atomic member removal failed", {
        code: error.code,
      });
      return mapMemberMutationError(error.message);
    }
  } else if (action === "change_role") {
    const role = typeof body.role === "string" ? (body.role as LabRole) : null;
    if (!role || !STAFF_ROLES.has(role)) {
      return jsonError("角色只能是 Professor 或 assistant。", 400);
    }

    const { error } = await admin.rpc("change_lab_member_role", {
      target_actor_id: user.id,
      target_lab_id: labId,
      target_member_user_id: memberUserId,
      target_role: role,
    });
    if (error) {
      console.error("[lab-members] Atomic member role change failed", {
        code: error.code,
      });
      return mapMemberMutationError(error.message);
    }
  } else {
    return jsonError("不支援的成員操作。", 400);
  }

  const { data: membership, error: readError } = await admin
    .from("lab_memberships")
    .select(
      "id,lab_id,user_id,role,status,joined_at,removed_at,removed_by,removal_reason,updated_at",
    )
    .eq("lab_id", labId)
    .eq("user_id", memberUserId)
    .single();
  if (readError) {
    console.error("[lab-members] Updated membership lookup failed", {
      code: readError.code,
    });
    return jsonError("成員已更新，但目前無法讀取結果。", 503);
  }

  return NextResponse.json({
    success: true,
    membership,
    seatUsage: await getSeatUsage(admin, labId),
  });
}
