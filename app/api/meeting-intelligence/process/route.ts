import { NextResponse } from "next/server";
import { getActiveApiUser } from "@/lib/auth/authorization";
import { processMeetingRecording } from "@/lib/meeting-intelligence/server";

export async function POST(request: Request) {
  const auth = await getActiveApiUser();
  if ("response" in auth) return auth.response;
  if (auth.context.profile.role !== "student") return NextResponse.json({ success: false, error: "STUDENT_ONLY" }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.recordingId !== "string") return NextResponse.json({ success: false, error: "INVALID_PROCESS_REQUEST" }, { status: 400 });
  const result = await processMeetingRecording({ supabase: auth.context.supabase as never, userId: auth.context.user.id, recordingId: body.recordingId });
  return NextResponse.json(result);
}
