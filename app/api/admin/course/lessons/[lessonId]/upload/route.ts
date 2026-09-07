/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { requireAdminContext } from "@/lib/admin/authorization";
import { createMuxClient } from "@/lib/course/mux-server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { admin } = await requireAdminContext("/admin/course");
  const { lessonId } = await params;
  if (!UUID_PATTERN.test(lessonId)) {
    return NextResponse.json({ success: false, error: "課程單元不存在。" }, { status: 400 });
  }
  const { data: lesson, error: lessonError } = await admin.from("course_lessons").select("id,course_id,title,video_provider").eq("id", lessonId).maybeSingle();
  if (lessonError) {
    console.error("[course-upload] Lesson lookup failed", { operation: "create-upload", code: lessonError.code, lessonId });
    return NextResponse.json({ success: false, error: "目前無法準備影片上傳。" }, { status: 500 });
  }
  if (!lesson) return NextResponse.json({ success: false, error: "課程單元不存在。" }, { status: 404 });
  if (lesson.video_provider !== "mux") return NextResponse.json({ success: false, error: "這個課程單元目前不是 Mux 影片。" }, { status: 409 });
  try {
    const upload = await createMuxClient().video.uploads.create({
      cors_origin: request.nextUrl.origin,
      new_asset_settings: { playback_policies: ["signed"], video_quality: "basic", meta: { external_id: lesson.id, title: lesson.title } },
    });
    if (!upload.url) throw new Error("Mux did not return an upload URL");
    const { error: updateError } = await admin.from("course_lessons").update({ video_upload_id: upload.id, video_status: "uploading" }).eq("id", lesson.id).eq("course_id", lesson.course_id);
    if (updateError) {
      console.error("[course-upload] Lesson state update failed", { operation: "mark-uploading", code: updateError.code, lessonId });
      return NextResponse.json({ success: false, error: "目前無法準備影片上傳。" }, { status: 500 });
    }
    const db = admin as any;
    const { data: previousVersion } = await db.from("course_video_versions").select("version_number").eq("lesson_id", lesson.id).order("version_number", { ascending: false }).limit(1).maybeSingle();
    const { error: versionError } = await db.from("course_video_versions").insert({ lesson_id: lesson.id, version_number: (previousVersion?.version_number ?? 0) + 1, video_provider: "mux", mux_upload_id: upload.id, status: "processing" });
    if (versionError) console.error("[course-upload] Version record creation failed", { code: versionError.code, lessonId });
    return NextResponse.json({ success: true, uploadId: upload.id, uploadUrl: upload.url });
  } catch (error) {
    console.error("[course-upload] Mux upload creation failed", { operation: "create-upload", lessonId, errorCode: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ success: false, error: "目前無法準備影片上傳。" }, { status: 502 });
  }
}
