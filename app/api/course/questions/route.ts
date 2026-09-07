/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getActiveApiUser } from "@/lib/auth/authorization";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const auth = await getActiveApiUser();
  if ("response" in auth) return auth.response;
  const { user, supabase } = auth.context;
  const db = supabase as any;
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch { return NextResponse.json({ success: false, error: "無效的請求內容。" }, { status: 400 }); }
  const lessonId = typeof body.lessonId === "string" ? body.lessonId : "";
  const timestampSeconds = typeof body.timestampSeconds === "number" && Number.isInteger(body.timestampSeconds) && body.timestampSeconds >= 0 ? body.timestampSeconds : null;
  const kind = body.kind === "unclear" ? "unclear" : "question";
  const question = typeof body.body === "string" ? body.body.trim().slice(0, 4000) : "";
  if (!UUID.test(lessonId) || timestampSeconds === null || (kind === "question" && !question)) return NextResponse.json({ success: false, error: "請確認提問內容與影片時間。" }, { status: 400 });
  const { data: lesson } = await db.from("course_lessons").select("id,is_published").eq("id", lessonId).eq("is_published", true).maybeSingle();
  if (!lesson) return NextResponse.json({ success: false, error: "你目前無法對這個單元提問。" }, { status: 403 });
  const { error } = await db.from("course_questions").insert({ lesson_id: lessonId, user_id: user.id, timestamp_seconds: timestampSeconds, kind, body: kind === "unclear" ? null : question });
  if (error) return NextResponse.json({ success: false, error: "目前無法送出提問。" }, { status: 500 });
  return NextResponse.json({ success: true });
}
