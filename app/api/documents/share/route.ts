import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
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

  const admin = createAdminClient();
  const [documentResult, membershipResult] = await Promise.all([
    admin
      .from("student_documents")
      .select("id,user_id")
      .eq("id", body.documentId)
      .eq("user_id", user.id)
      .maybeSingle(),
    admin
      .from("lab_memberships")
      .select("id")
      .eq("lab_id", body.labId)
      .eq("user_id", user.id)
      .eq("role", "student")
      .eq("status", "active")
      .maybeSingle(),
  ]);
  const { data: document, error: documentError } = documentResult;
  const { data: membership, error: membershipError } = membershipResult;

  if (documentError || membershipError) {
    console.error("[document-share] Authorization lookup failed", {
      documentCode: documentError?.code,
      membershipCode: membershipError?.code,
    });
    return jsonError("目前無法確認分享權限。", 500);
  }

  if (!document || (body.action === "grant" && !membership)) {
    return jsonError("你只能分享自己的文件到已加入的 Lab。", 403);
  }

  const now = new Date().toISOString();
  const query =
    body.action === "grant"
      ? admin.from("audit_summary_shares").upsert(
          {
            document_id: document.id,
            student_user_id: user.id,
            lab_id: body.labId,
            consented_at: now,
            revoked_at: null,
            updated_at: now,
          },
          { onConflict: "document_id,lab_id" },
        )
      : admin
          .from("audit_summary_shares")
          .update({ revoked_at: now, updated_at: now })
          .eq("document_id", document.id)
          .eq("student_user_id", user.id)
          .eq("lab_id", body.labId);
  const { error } = await query;

  if (error) {
    console.error("[document-share] Consent update failed", { code: error.code });
    return jsonError("目前無法更新分享設定。", 500);
  }

  return NextResponse.json({
    success: true,
    shared: body.action === "grant",
  });
}
