import { NextResponse } from "next/server";
import { requireAdminContext } from "@/lib/admin/authorization";

export async function GET(_request: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const { admin } = await requireAdminContext("/admin/course");
  const { lessonId } = await params;
  const { data, error } = await admin.from("course_lessons").select("video_status").eq("id", lessonId).maybeSingle();
  if (error || !data) return NextResponse.json({ success: false, error: "找不到課程單元。" }, { status: error ? 500 : 404 });
  return NextResponse.json({ success: true, status: data.video_status }, { headers: { "Cache-Control": "no-store" } });
}
