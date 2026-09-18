import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveApiUser } from "@/lib/auth/authorization";
import { assertStudentMeeting, parseAnalysis } from "@/lib/meeting-intelligence/server";

type SelectedAction = { title?: unknown; dueDate?: unknown; selected?: unknown };

export async function POST(request: Request) {
  const auth = await getActiveApiUser();
  if ("response" in auth) return auth.response;
  if (auth.context.profile.role !== "student") return NextResponse.json({ success: false, error: "STUDENT_ONLY" }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.intelligenceId !== "string") return NextResponse.json({ success: false, error: "INVALID_CONFIRM_REQUEST" }, { status: 400 });
  const supabase = auth.context.supabase as unknown as SupabaseClient;
  const { data: intelligence, error } = await supabase.from("meeting_intelligence").select("id,meeting_id,student_user_id,analysis,status").eq("id", body.intelligenceId).eq("student_user_id", auth.context.user.id).maybeSingle();
  if (error || !intelligence || intelligence.status !== "draft") return NextResponse.json({ success: false, error: "INTELLIGENCE_NOT_AVAILABLE" }, { status: 400 });
  const analysis = parseAnalysis(intelligence.analysis);
  if (!analysis) return NextResponse.json({ success: false, error: "ANALYSIS_NOT_READY" }, { status: 400 });
  try {
    const meeting = await assertStudentMeeting(supabase, auth.context.user.id, intelligence.meeting_id);
    const summary = typeof body.summary === "string" && body.summary.trim() ? body.summary.trim().slice(0, 3000) : analysis.summary;
    const decisions = typeof body.decisions === "string" ? body.decisions.trim().slice(0, 3000) : analysis.decisions.join("\n");
    const { error: meetingError } = await supabase.from("meetings").update({ summary, decisions: decisions || null, status: meeting.status === "scheduled" ? "completed" : meeting.status }).eq("id", meeting.id).eq("student_user_id", auth.context.user.id).eq("created_by", auth.context.user.id);
    if (meetingError) throw new Error("MEETING_CONFIRM_FAILED");
    const selected = Array.isArray(body.actions) ? body.actions as SelectedAction[] : [];
    const actions = selected.filter((item) => item.selected === true).map((item) => ({
      meeting_id: meeting.id,
      lab_id: meeting.lab_id,
      student_user_id: auth.context.user.id,
      title: typeof item.title === "string" ? item.title.trim().slice(0, 500) : "",
      owner_type: "student",
      owner_user_id: auth.context.user.id,
      due_date: typeof item.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.dueDate) ? item.dueDate : null,
      status: "todo",
    })).filter((item) => item.title);
    if (actions.length) {
      const { error: actionError } = await supabase.from("meeting_actions").insert(actions);
      if (actionError) throw new Error("MEETING_ACTION_CONFIRM_FAILED");
    }
    const { error: intelligenceError } = await supabase.from("meeting_intelligence").update({ status: "confirmed", user_edited: Boolean(body.summary || body.decisions), confirmed_at: new Date().toISOString() }).eq("id", intelligence.id).eq("student_user_id", auth.context.user.id);
    if (intelligenceError) throw new Error("INTELLIGENCE_CONFIRM_FAILED");
    return NextResponse.json({ success: true, message: "✓ Meeting 與選取的下一步已確認" });
  } catch (confirmError) {
    return NextResponse.json({ success: false, error: confirmError instanceof Error ? confirmError.message : "CONFIRM_FAILED" }, { status: 400 });
  }
}
