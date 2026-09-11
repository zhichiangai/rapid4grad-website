import { NextResponse } from "next/server";
import { getActiveApiUser } from "@/lib/auth/authorization";
import { getLabMutationAccess, asPlanningClient, planningErrorMessage } from "@/lib/professor/lab-planning";

type Context = { params: Promise<{ labId: string }> };

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

export async function POST(request: Request, { params }: Context) {
  const auth = await getActiveApiUser();
  if ("response" in auth) return auth.response;
  const { labId } = await params;
  const access = await getLabMutationAccess(auth.context, labId);
  if (!access.allowed) return NextResponse.json({ success: false, error: planningErrorMessage(access.reason) }, { status: 403 });
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  const title = text(payload?.title, 200);
  const resourceUrl = text(payload?.resourceUrl, 2000);
  const description = text(payload?.description, 2000);
  const category = text(payload?.category, 100);
  if (!title || !validUrl(resourceUrl)) return NextResponse.json({ success: false, error: "請填寫標題與有效網址。" }, { status: 400 });
  const { data, error } = await asPlanningClient(auth.context).from("lab_resources").insert({ lab_id: labId, title, description: description || null, category: category || null, resource_url: resourceUrl, created_by: auth.context.user.id }).select("id,lab_id,title,description,category,resource_url,created_by,created_at,updated_at,archived_at").single();
  if (error) {
    console.error("[lab-planning] resource create failed", { code: error.code });
    return NextResponse.json({ success: false, error: "資源建立失敗，請稍後再試。" }, { status: 400 });
  }
  return NextResponse.json({ success: true, resource: data });
}
