import { NextRequest, NextResponse } from "next/server";
import { createV2AdminClient, createV2Client } from "@/lib/supabase/server";
import { canAccessWorkspace } from "@/lib/workspace/access";

export const runtime = "nodejs";

type CreateLabBody = { name?: unknown; institution?: unknown };

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  const supabase = await createV2Client();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return jsonError("請先登入教授帳號。", 401);

  let body: CreateLabBody;
  try {
    body = (await request.json()) as CreateLabBody;
  } catch {
    return jsonError("請求格式不正確。", 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const institution =
    typeof body.institution === "string" ? body.institution.trim() : "";
  if (name.length < 2 || name.length > 120 || institution.length > 160) {
    return jsonError("Lab 名稱或學校／單位格式不正確。", 400);
  }

  const admin = createV2AdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Professor profile lookup failed", { code: profileError.code });
    return jsonError("目前無法驗證教授帳號。", 503);
  }
  if (!canAccessWorkspace(profile?.role, "professor") || profile?.role !== "professor") {
    return jsonError("只有 Professor 帳號可以建立 Lab。", 403);
  }

  const { data: labId, error } = await admin.rpc("create_professor_lab", {
    target_professor_id: user.id,
    target_name: name,
    target_institution: institution || undefined,
  });

  if (error) {
    console.error("Professor Lab creation failed", { code: error.code });
    if (error.message.includes("already_owns_active_lab")) {
      return jsonError("每位 Professor 同時只能擁有一個 active Lab。", 409);
    }
    return jsonError("目前無法建立 Lab，請稍後再試。", 503);
  }

  const { data: lab, error: readError } = await admin
    .from("labs")
    .select("id,name,institution,created_at")
    .eq("id", labId)
    .single();
  if (readError) {
    console.error("Created Lab lookup failed", { code: readError.code });
    return jsonError("Lab 已建立，但暫時無法讀取結果。", 503);
  }

  return NextResponse.json({ success: true, lab }, { status: 201 });
}
