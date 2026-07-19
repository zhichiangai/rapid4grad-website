import { NextRequest, NextResponse } from "next/server";
import { resolvePlaybackSource } from "@/lib/course/playback";
import { createV2Client } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ lessonId: string }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, context: RouteContext) {
  const { lessonId } = await context.params;
  if (!UUID_PATTERN.test(lessonId)) {
    return NextResponse.json(
      { success: false, error: "無效的課程單元。" },
      { status: 400 },
    );
  }

  const supabase = await createV2Client();
  const { data: lesson, error } = await supabase
    .from("course_lessons")
    .select("id,title,video_provider,video_external_id")
    .eq("id", lessonId)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    console.error("Course playback authorization query failed", {
      code: error.code,
      lessonId,
    });
    return NextResponse.json(
      { success: false, error: "目前無法載入影片。" },
      { status: 500 },
    );
  }

  if (!lesson) {
    return NextResponse.json(
      { success: false, error: "你目前無法觀看這個單元。" },
      { status: 404 },
    );
  }

  if (!lesson.video_external_id) {
    return NextResponse.json(
      { success: false, error: "這個單元的影片尚未上架。" },
      { status: 409 },
    );
  }

  try {
    const source = resolvePlaybackSource(
      lesson.video_provider,
      lesson.video_external_id,
      request.nextUrl.origin,
    );

    return NextResponse.json(
      {
        success: true,
        playback: {
          lessonId: lesson.id,
          title: lesson.title,
          ...source,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (playbackError) {
    console.error("Course playback source rejected", {
      lessonId,
      name:
        playbackError instanceof Error
          ? playbackError.name
          : "UnknownError",
    });
    return NextResponse.json(
      { success: false, error: "這個影片來源目前無法播放。" },
      { status: 422 },
    );
  }
}
