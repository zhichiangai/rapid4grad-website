import { NextResponse } from "next/server";
import { getActiveApiUser } from "@/lib/auth/authorization";
import { getLabMutationAccess, asPlanningClient, planningErrorMessage } from "@/lib/professor/lab-planning";

type Context = { params: Promise<{ labId: string; milestoneId: string }> };

function text(value: unknown, max: number) {
  return typeof value === "string" && value.trim().length <= max ? value.trim() : null;
}

export async function PATCH(request: Request, { params }: Context) {
  const auth = await getActiveApiUser();
  if ("response" in auth) return auth.response;
  const { labId, milestoneId } = await params;
  const access = await getLabMutationAccess(auth.context, labId);
  if (!access.allowed) return NextResponse.json({ success: false, error: planningErrorMessage(access.reason) }, { status: 403 });
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  const update: Record<string, string | null> = {};
  if ("title" in (payload ?? {})) update.title = text(payload?.title, 200);
  if ("description" in (payload ?? {})) update.description = text(payload?.description, 2000);
  if ("targetDate" in (payload ?? {})) {
    const targetDate = text(payload?.targetDate, 10);
    if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return NextResponse.json({ success: false, error: "請輸入有效日期。" }, { status: 400 });
    update.target_date = targetDate;
  }
  if ("status" in (payload ?? {})) {
    const status = text(payload?.status, 16);
    if (!status || !["active", "completed", "canceled", "archived"].includes(status)) return NextResponse.json({ success: false, error: "無效的里程碑狀態。" }, { status: 400 });
    update.status = status;
  }
  if (!Object.keys(update).length) return NextResponse.json({ success: false, error: "沒有可更新的內容。" }, { status: 400 });
  const { data, error } = await asPlanningClient(auth.context).from("lab_milestones").update(update).eq("id", milestoneId).eq("lab_id", labId).select("id,lab_id,title,description,target_date,status,created_by,created_at,updated_at").single();
  if (error) {
    console.error("[lab-planning] milestone update failed", { code: error.code });
    return NextResponse.json({ success: false, error: "里程碑更新失敗，請稍後再試。" }, { status: 400 });
  }
  return NextResponse.json({ success: true, milestone: data });
}
