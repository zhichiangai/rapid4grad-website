/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getActiveApiUser } from "@/lib/auth/authorization";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clampSeconds = (value: unknown, max = 24 * 60 * 60) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max ? Math.floor(value) : null;

export async function POST(request: NextRequest) {
  const auth = await getActiveApiUser();
  if ("response" in auth) return auth.response;
  const { user, supabase } = auth.context;
  const db = supabase as any;
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch { return NextResponse.json({ success: false, error: "無效的請求內容。" }, { status: 400 }); }
  const action = typeof body.action === "string" ? body.action : "";
  const lessonId = typeof body.lessonId === "string" ? body.lessonId : "";
  if (!UUID.test(lessonId) || !["start", "heartbeat", "segment", "complete"].includes(action)) return NextResponse.json({ success: false, error: "分析資料格式不正確。" }, { status: 400 });
  const { data: lesson, error: lessonError } = await db.from("course_lessons").select("id,is_published").eq("id", lessonId).eq("is_published", true).maybeSingle();
  if (lessonError) return NextResponse.json({ success: false, error: "目前無法記錄觀看資料。" }, { status: 500 });
  if (!lesson) return NextResponse.json({ success: false, error: "你目前無法觀看這個單元。" }, { status: 403 });

  if (action === "start") {
    const duration = clampSeconds(body.duration);
    const position = clampSeconds(body.position) ?? 0;
    const { data, error } = await db.from("course_view_sessions").insert({ user_id: user.id, lesson_id: lessonId, duration_seconds: duration, last_position_seconds: position, max_position_seconds: position }).select("id").single();
    if (error) return NextResponse.json({ success: false, error: "目前無法開始記錄觀看。" }, { status: 500 });
    return NextResponse.json({ success: true, sessionId: data.id });
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  if (!UUID.test(sessionId)) return NextResponse.json({ success: false, error: "觀看工作階段無效。" }, { status: 400 });
  const { data: session } = await db.from("course_view_sessions").select("id,last_position_seconds,max_position_seconds,watch_time_seconds").eq("id", sessionId).eq("lesson_id", lessonId).eq("user_id", user.id).maybeSingle();
  if (!session) return NextResponse.json({ success: false, error: "找不到觀看工作階段。" }, { status: 404 });

  if (action === "segment") {
    const start = clampSeconds(body.start);
    const end = clampSeconds(body.end);
    const sequence = typeof body.sequence === "number" && Number.isInteger(body.sequence) && body.sequence > 0 ? body.sequence : null;
    const transition = body.transition === "forward_skip" || body.transition === "backward_replay" ? body.transition : "continuous";
    if (start === null || end === null || end < start || sequence === null) return NextResponse.json({ success: false, error: "觀看片段格式不正確。" }, { status: 400 });
    const { error } = await db.from("course_watch_segments").insert({ session_id: sessionId, user_id: user.id, lesson_id: lessonId, sequence_number: sequence, start_seconds: start, end_seconds: end, transition_kind: transition });
    if (error && error.code !== "23505") return NextResponse.json({ success: false, error: "目前無法記錄觀看片段。" }, { status: 500 });
    const position = end;
    await db.from("course_view_sessions").update({ last_seen_at: new Date().toISOString(), last_position_seconds: position, max_position_seconds: Math.max(session.max_position_seconds ?? 0, position), watch_time_seconds: (session.watch_time_seconds ?? 0) + Math.max(0, end - start) }).eq("id", sessionId).eq("user_id", user.id);
    return NextResponse.json({ success: true });
  }

  const position = clampSeconds(body.position);
  if (position === null) return NextResponse.json({ success: false, error: "播放位置不正確。" }, { status: 400 });
  const duration = clampSeconds(body.duration);
  const update: Record<string, unknown> = { last_seen_at: new Date().toISOString(), last_position_seconds: position, max_position_seconds: Math.max(session.max_position_seconds ?? 0, position) };
  if (duration !== null) update.duration_seconds = duration;
  if (action === "complete") update.completed_at = new Date().toISOString();
  const { error } = await db.from("course_view_sessions").update(update).eq("id", sessionId).eq("lesson_id", lessonId).eq("user_id", user.id);
  if (error) return NextResponse.json({ success: false, error: "目前無法更新觀看資料。" }, { status: 500 });
  return NextResponse.json({ success: true });
}
