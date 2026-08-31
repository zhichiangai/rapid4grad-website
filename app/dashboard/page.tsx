"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  StudentLeadSummary,
  StudentWorkspaceHome,
} from "@/components/workspace/StudentWorkspaceHome";
import { createClient } from "@/lib/supabase/client";
import { getTaipeiMonday } from "@/lib/supervision/week";

type AdvisorMemory = {
  id: string;
  thinking_style: string | null;
  frequent_questions: string[] | null;
  raw_content: string;
};

function splitQuestions(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function DashboardPage() {
  const [leadSummary, setLeadSummary] = useState<StudentLeadSummary | null>(
    null,
  );
  const [memoryId, setMemoryId] = useState("");
  const [advisorStyle, setAdvisorStyle] = useState("");
  const [frequentQuestions, setFrequentQuestions] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [weeklyCheckIn, setWeeklyCheckIn] = useState<{ updatedAt: string | null }>({ updatedAt: null });
  const [meetingSummary, setMeetingSummary] = useState<{ pendingCount: number; nextMeetingAt: string | null }>({ pendingCount: 0, nextMeetingAt: null });
  const [actionSummary, setActionSummary] = useState({ overdueCount: 0, dueSoonCount: 0, openCount: 0 });

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      if (!isMounted) return;

      setUserId(user.id);
      const email = user.email?.toLowerCase();

      const { data: weekly } = await supabase
        .from("weekly_updates")
        .select("id,updated_at")
        .eq("student_user_id", user.id)
        .eq("week_start", getTaipeiMonday())
        .maybeSingle<{ id: string; updated_at: string }>();

      if (isMounted) setWeeklyCheckIn({ updatedAt: weekly?.updated_at ?? null });

      const { data: meetings } = await supabase
        .from("meetings")
        .select("meeting_at,status")
        .eq("student_user_id", user.id)
        .order("meeting_at", { ascending: true });
      const now = Date.now();
      const scheduled = (meetings ?? []).filter((meeting: { meeting_at: string; status: string }) => meeting.status === "scheduled");
      const nextMeeting = scheduled.find((meeting: { meeting_at: string }) => new Date(meeting.meeting_at).getTime() > now);
      if (isMounted) setMeetingSummary({
        pendingCount: scheduled.filter((meeting: { meeting_at: string }) => new Date(meeting.meeting_at).getTime() <= now).length,
        nextMeetingAt: nextMeeting?.meeting_at ?? null,
      });

      const { data: actions } = await supabase.from("meeting_actions").select("due_date,status").eq("student_user_id", user.id);
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      const maxDate = new Date(`${today}T00:00:00Z`);
      maxDate.setUTCDate(maxDate.getUTCDate() + 14);
      const maxDateString = maxDate.toISOString().slice(0, 10);
      const openActions = (actions ?? []).filter((action: { status: string }) => action.status === "todo" || action.status === "doing");
      if (isMounted) setActionSummary({
        overdueCount: openActions.filter((action: { due_date: string | null }) => Boolean(action.due_date && action.due_date < today)).length,
        dueSoonCount: openActions.filter((action: { due_date: string | null }) => Boolean(action.due_date && action.due_date >= today && action.due_date <= maxDateString)).length,
        openCount: openActions.length,
      });

      if (email) {
        const { data: lead } = await supabase
          .from("leads")
          .select("quiz_result,quiz_score,main_tags")
          .eq("email", email)
          .not("quiz_result", "is", null)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle<StudentLeadSummary>();

        if (isMounted) {
          setLeadSummary(lead ?? null);
        }
      }

      const { data: memory } = await supabase
        .from("advisor_memories")
        .select("id,thinking_style,frequent_questions,raw_content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<AdvisorMemory>();

      if (isMounted && memory) {
        setMemoryId(memory.id);
        setAdvisorStyle(memory.thinking_style ?? "");
        setFrequentQuestions((memory.frequent_questions ?? []).join("\n"));
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmitAdvisorMemory(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!userId) {
      setMessage("請先登入後再儲存教授記憶庫。");
      return;
    }

    const questions = splitQuestions(frequentQuestions);

    if (!advisorStyle.trim() && questions.length === 0) {
      setMessage("請至少填寫教授偏好風格或常問問題。");
      return;
    }

    setIsSaving(true);
    setMessage("");

    const rawContent = [
      advisorStyle.trim() ? `教授偏好風格：${advisorStyle.trim()}` : "",
      questions.length ? `常問問題：\n${questions.join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const supabase = createClient();
    const payload = {
      user_id: userId,
      source_type: "note",
      raw_content: rawContent,
      thinking_style: advisorStyle.trim() || null,
      frequent_questions: questions,
      general_preferences: advisorStyle.trim() ? [advisorStyle.trim()] : [],
    };

    const { data, error } = memoryId
      ? await supabase
          .from("advisor_memories")
          .update(payload)
          .eq("id", memoryId)
          .select("id")
          .single()
      : await supabase
          .from("advisor_memories")
          .insert(payload)
          .select("id")
          .single();

    setIsSaving(false);

    if (error) {
      setMessage("儲存失敗，請稍後再試。");
      return;
    }

    setMemoryId(data.id);
    setMessage("已儲存指導教授長期記憶庫。下次產生 AI 指令時可手動填入這些偏好。");
  }

  return (
    <StudentWorkspaceHome
      leadSummary={leadSummary}
      isLoading={isLoading}
      advisorStyle={advisorStyle}
      frequentQuestions={frequentQuestions}
      onAdvisorStyleChange={setAdvisorStyle}
      onFrequentQuestionsChange={setFrequentQuestions}
      onSubmitAdvisorMemory={handleSubmitAdvisorMemory}
      isSaving={isSaving}
      message={message}
      weeklyCheckIn={weeklyCheckIn}
      meetingSummary={meetingSummary}
      actionSummary={actionSummary}
    />
  );
}
