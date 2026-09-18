import { NextResponse } from "next/server";
import { getActiveApiUser } from "@/lib/auth/authorization";
import { createMeetingUploadUrl } from "@/lib/meeting-intelligence/server";

export async function POST(request: Request) {
  const auth = await getActiveApiUser();
  if ("response" in auth) return auth.response;
  if (auth.context.profile.role !== "student") return NextResponse.json({ success: false, error: "STUDENT_ONLY" }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.meetingId !== "string" || typeof body.filename !== "string" || typeof body.mimeType !== "string" || typeof body.sizeBytes !== "number" || body.consent !== true) return NextResponse.json({ success: false, error: "INVALID_UPLOAD_REQUEST" }, { status: 400 });
  try {
    const result = await createMeetingUploadUrl({ supabase: auth.context.supabase as never, userId: auth.context.user.id, meetingId: body.meetingId, filename: body.filename, mimeType: body.mimeType, sizeBytes: body.sizeBytes });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "UPLOAD_FAILED" }, { status: 400 });
  }
}
