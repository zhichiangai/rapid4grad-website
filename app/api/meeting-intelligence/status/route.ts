import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveApiUser } from "@/lib/auth/authorization";

export async function GET(request: Request) {
  const auth = await getActiveApiUser();
  if ("response" in auth) return auth.response;
  if (auth.context.profile.role !== "student") return NextResponse.json({ success: false, error: "STUDENT_ONLY" }, { status: 403 });
  const meetingId = new URL(request.url).searchParams.get("meetingId");
  if (!meetingId) return NextResponse.json({ success: false, error: "MEETING_REQUIRED" }, { status: 400 });
  const supabase = auth.context.supabase as unknown as SupabaseClient;
  const { data, error } = await supabase.from("meeting_intelligence").select("id,meeting_id,analysis,status,created_at,updated_at").eq("meeting_id", meetingId).eq("student_user_id", auth.context.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) return NextResponse.json({ success: false, error: "STATUS_UNAVAILABLE" }, { status: 500 });
  return NextResponse.json({ success: true, intelligence: data ?? null });
}
