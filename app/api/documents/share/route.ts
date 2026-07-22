import { NextRequest, NextResponse } from "next/server";
import { createV2AdminClient, createV2Client } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BODY_LIMIT_BYTES = 2048;

type ShareBody = {
  documentId?: unknown;
  labId?: unknown;
  action?: unknown;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function parseBody(request: NextRequest): Promise<ShareBody | null> {
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > BODY_LIMIT_BYTES) return null;
  try {
    return JSON.parse(raw) as ShareBody;
  } catch {
    return null;
  }
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createV2Client();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError("請先登入。", 401);

  const body = await parseBody(request);
  if (
    !body ||
    !isUuid(body.documentId) ||
    !isUuid(body.labId) ||
    (body.action !== "grant" && body.action !== "revoke")
  ) {
    return jsonError("無效的分享設定。", 400);
  }

  const admin = createV2AdminClient();
  const { error } =
    body.action === "grant"
      ? await admin.rpc("grant_audit_summary_consent", {
          target_student_id: user.id,
          target_document_id: body.documentId,
          target_lab_id: body.labId,
        })
      : await admin.rpc("revoke_audit_summary_consent", {
          target_student_id: user.id,
          target_document_id: body.documentId,
          target_lab_id: body.labId,
        });

  if (error) {
    console.error("[document-share] Consent update failed", { code: error.code });
    if (
      error.message.includes("owned_document_required") ||
      error.message.includes("active_student_lab_membership_required")
    ) {
      return jsonError("你只能分享自己的文件到目前加入的 Lab。", 403);
    }
    if (error.message.includes("summary_consent_not_found")) {
      return jsonError("找不到可撤回的摘要分享。", 404);
    }
    return jsonError("目前無法更新分享設定。", 503);
  }

  return NextResponse.json({
    success: true,
    shared: body.action === "grant",
  });
}
