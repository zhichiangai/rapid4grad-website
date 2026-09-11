import { NextResponse } from "next/server";
import { getActiveApiUser } from "@/lib/auth/authorization";
import { getLabMutationAccess, asPlanningClient, planningErrorMessage } from "@/lib/professor/lab-planning";

type Context = { params: Promise<{ labId: string; resourceId: string }> };

function text(value: unknown, max: number) {
  return typeof value === "string" && value.trim().length <= max ? value.trim() : null;
}

function validUrl(value: string | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function PATCH(request: Request, { params }: Context) {
  const auth = await getActiveApiUser();
  if ("response" in auth) return auth.response;
  const { labId, resourceId } = await params;
  const access = await getLabMutationAccess(auth.context, labId);
  if (!access.allowed) return NextResponse.json({ success: false, error: planningErrorMessage(access.reason) }, { status: 403 });
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  const update: Record<string, string | null> = {};
  if ("title" in (payload ?? {})) update.title = text(payload?.title, 200);
  if ("description" in (payload ?? {})) update.description = text(payload?.description, 2000);
  if ("category" in (payload ?? {})) update.category = text(payload?.category, 100);
  if ("resourceUrl" in (payload ?? {})) {
    const resourceUrl = text(payload?.resourceUrl, 2000);
    if (!validUrl(resourceUrl)) return NextResponse.json({ success: false, error: "請輸入有效網址。" }, { status: 400 });
    update.resource_url = resourceUrl;
  }
  if (payload?.archive === true) update.archived_at = new Date().toISOString();
  if (!Object.keys(update).length) return NextResponse.json({ success: false, error: "沒有可更新的內容。" }, { status: 400 });
  const { data, error } = await asPlanningClient(auth.context).from("lab_resources").update(update).eq("id", resourceId).eq("lab_id", labId).is("archived_at", null).select("id,lab_id,title,description,category,resource_url,created_by,created_at,updated_at,archived_at").single();
  if (error) {
    console.error("[lab-planning] resource update failed", { code: error.code });
    return NextResponse.json({ success: false, error: "資源更新失敗，請稍後再試。" }, { status: 400 });
  }
  return NextResponse.json({ success: true, resource: data });
}
