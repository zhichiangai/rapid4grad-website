import { NextResponse } from "next/server";
import { getActiveApiUser } from "@/lib/auth/authorization";
import { getLabMutationAccess, asPlanningClient, planningErrorMessage } from "@/lib/professor/lab-planning";

type Context = { params: Promise<{ labId: string }> };

function text(value: unknown, max: number) {
  return typeof value === "string" && value.trim().length <= max ? value.trim() : null;
}

export async function POST(request: Request, { params }: Context) {
  const auth = await getActiveApiUser();
  if ("response" in auth) return auth.response;
  const { labId } = await params;
  const access = await getLabMutationAccess(auth.context, labId);
  if (!access.allowed) return NextResponse.json({ success: false, error: planningErrorMessage(access.reason) }, { status: 403 });
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  const title = text(payload?.title, 200);
  const targetDate = text(payload?.targetDate, 10);
  const description = text(payload?.description, 2000);
  if (!title || !targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return NextResponse.json({ success: false, error: "請填寫標題與有效日期。" }, { status: 400 });
  const { data, error } = await asPlanningClient(auth.context).from("lab_milestones").insert({ lab_id: labId, title, description: description || null, target_date: targetDate, status: "active", created_by: auth.context.user.id }).select("id,lab_id,title,description,target_date,status,created_by,created_at,updated_at").single();
  if (error) {
    console.error("[lab-planning] milestone create failed", { code: error.code });
    return NextResponse.json({ success: false, error: "里程碑建立失敗，請稍後再試。" }, { status: 400 });
  }
  return NextResponse.json({ success: true, milestone: data });
}
