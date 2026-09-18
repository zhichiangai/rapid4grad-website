import { NextResponse } from "next/server";
import { getActiveApiUser } from "@/lib/auth/authorization";
import { createTranscriptRecording, processMeetingRecording } from "@/lib/meeting-intelligence/server";

export async function POST(request: Request) {
  const auth = await getActiveApiUser();
  if ("response" in auth) return auth.response;
  if (auth.context.profile.role !== "student") return NextResponse.json({ success: false, error: "STUDENT_ONLY" }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.meetingId !== "string" || typeof body.transcript !== "string") return NextResponse.json({ success: false, error: "INVALID_TRANSCRIPT_REQUEST" }, { status: 400 });
  try {
    const created = await createTranscriptRecording({ supabase: auth.context.supabase as never, userId: auth.context.user.id, meetingId: body.meetingId, transcript: body.transcript });
    const result = await processMeetingRecording({ supabase: auth.context.supabase as never, userId: auth.context.user.id, recordingId: created.recordingId });
    return NextResponse.json({ success: result.ok, intelligenceId: created.intelligenceId, analysis: result.ok ? result.analysis : null, message: result.ok ? null : result.message });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "TRANSCRIPT_FAILED" }, { status: 400 });
  }
}
