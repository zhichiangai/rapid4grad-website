import { NextRequest, NextResponse } from "next/server";
import { createV2Client } from "@/lib/supabase/server";

type ProgressBody = {
  lessonId?: unknown;
  status?: unknown;
  progressSeconds?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_STATUSES = ["not_started", "in_progress", "completed"] as const;

export async function POST(request: NextRequest) {
  const supabase = await createV2Client();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "請先登入再記錄觀看進度。" },
      { status: 401 },
    );
  }

  let body: ProgressBody;
  try {
    body = (await request.json()) as ProgressBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "無效的請求內容。" },
      { status: 400 },
    );
  }

  const lessonId = typeof body.lessonId === "string" ? body.lessonId : "";
  const status =
    typeof body.status === "string" &&
    ALLOWED_STATUSES.includes(
      body.status as (typeof ALLOWED_STATUSES)[number],
    )
      ? (body.status as (typeof ALLOWED_STATUSES)[number])
      : null;
  const progressSeconds =
    typeof body.progressSeconds === "number" &&
    Number.isInteger(body.progressSeconds) &&
    body.progressSeconds >= 0 &&
    body.progressSeconds <= 24 * 60 * 60
      ? body.progressSeconds
      : null;

  if (!UUID_PATTERN.test(lessonId) || !status || progressSeconds === null) {
    return NextResponse.json(
      { success: false, error: "課程進度資料格式不正確。" },
      { status: 400 },
    );
  }

  const { data: lesson, error: lessonError } = await supabase
    .from("course_lessons")
    .select("id")
    .eq("id", lessonId)
    .eq("is_published", true)
    .maybeSingle();

  if (lessonError) {
    console.error("Course progress lesson authorization failed", {
      code: lessonError.code,
      lessonId,
      userId: user.id,
    });
    return NextResponse.json(
      { success: false, error: "目前無法更新觀看進度。" },
      { status: 500 },
    );
  }

  if (!lesson) {
    return NextResponse.json(
      { success: false, error: "你目前無法觀看這個單元。" },
      { status: 403 },
    );
  }

  const { error: progressError } = await supabase
    .from("course_progress")
    .upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        status,
        progress_seconds: progressSeconds,
        completed_at:
          status === "completed" ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,lesson_id" },
    );

  if (progressError) {
    console.error("Course progress persistence failed", {
      code: progressError.code,
      lessonId,
      userId: user.id,
    });
    return NextResponse.json(
      { success: false, error: "目前無法更新觀看進度。" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
