import { NextResponse } from "next/server";
import { getActiveApiUser } from "@/lib/auth/authorization";
import { updateProfessorOperation } from "@/lib/professor/ai-gateway";

type Context = { params: Promise<{ operationId: string }> };

export async function POST(_request: Request, { params }: Context) {
  const auth = await getActiveApiUser();
  if ("response" in auth) return auth.response;
  if (auth.context.profile.role !== "professor") return NextResponse.json({ success: false, error: "PROFESSOR_ACCESS_REQUIRED" }, { status: 403 });
  const { operationId } = await params;
  await updateProfessorOperation(operationId, auth.context.user.id, "canceled");
  return NextResponse.json({ success: true });
}
