import { NextRequest, NextResponse } from "next/server";
import { requireAdminContext } from "@/lib/admin/authorization";
import { isValidMuxPlaybackId, signMuxPlaybackToken } from "@/lib/course/mux";
import { resolvePlaybackSource } from "@/lib/course/playback";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { admin } = await requireAdminContext("/admin/course/preview");
  const { lessonId } = await params;
  if (!UUID_PATTERN.test(lessonId)) return NextResponse.json({ success: false, error: "課程單元不存在。" }, { status: 400 });
  const { data: lesson, error } = await admin.from("course_lessons").select("id,title,video_provider,video_external_id,video_status").eq("id", lessonId).maybeSingle();
  if (error) {
    console.error("[admin-course-playback] Lesson lookup failed", { operation: "playback", code: error.code, lessonId });
    return NextResponse.json({ success: false, error: "目前無法取得影片。" }, { status: 500 });
  }
  if (!lesson?.video_external_id || (lesson.video_provider === "mux" && lesson.video_status !== "ready")) return NextResponse.json({ success: false, error: "影片尚未準備完成。" }, { status: 422 });
  try {
    const playback = lesson.video_provider === "mux"
      ? isValidMuxPlaybackId(lesson.video_external_id)
        ? { provider: "mux" as const, lessonId: lesson.id, title: lesson.title, playbackId: lesson.video_external_id, playbackToken: await signMuxPlaybackToken(lesson.video_external_id) }
        : null
      : resolvePlaybackSource(lesson.video_provider, lesson.video_external_id, request.nextUrl.origin);
    if (!playback) return NextResponse.json({ success: false, error: "影片目前無法播放。" }, { status: 422 });
    return NextResponse.json({ success: true, playback });
  } catch (error) {
    console.error("[admin-course-playback] Playback signing failed", { operation: "sign-playback", lessonId, errorCode: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ success: false, error: "目前無法取得影片。" }, { status: 502 });
  }
}
