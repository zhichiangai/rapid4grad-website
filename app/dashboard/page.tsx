"use client";

import { useEffect, useState } from "react";
import {
  StudentLeadSummary,
  StudentWorkspaceHome,
} from "@/components/workspace/StudentWorkspaceHome";
import { createClient } from "@/lib/supabase/client";
import { getTaipeiMonday } from "@/lib/supervision/week";
import { getThesisProgressSummary, mergeMilestoneDefinitionsWithRows, type ThesisMilestoneRow } from "@/lib/thesis-progress/thesis-domain";
import { deriveGraduationRiskSignals, deriveGraduationRiskStatus, getPrimaryGraduationRiskSignal } from "@/lib/graduation-risk/risk-domain";
import { deriveStudentActivationState, type StudentActivationState } from "@/lib/student/activation";

type AdvisorMemory = {
  id: string;
  preference_style: string | null;
  common_questions: string[] | null;
  custom_notes: string | null;
};

export default function DashboardPage() {
  const [leadSummary, setLeadSummary] = useState<StudentLeadSummary | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyCheckIn, setWeeklyCheckIn] = useState<{ updatedAt: string | null }>({ updatedAt: null });
  const [meetingSummary, setMeetingSummary] = useState<{ pendingCount: number; nextMeetingAt: string | null }>({ pendingCount: 0, nextMeetingAt: null });
  const [actionSummary, setActionSummary] = useState({ overdueCount: 0, dueSoonCount: 0, openCount: 0 });
  const [thesisSummary, setThesisSummary] = useState<{ currentLabel: string; completedCount: number; blocked: boolean } | undefined>();
  const [graduationRisk, setGraduationRisk] = useState<{ status: "urgent" | "attention" | "stable" | "setup_needed"; label: string; reason: string } | undefined>();
  const [advisorConfigured, setAdvisorConfigured] = useState(false);
  const [learningSummary, setLearningSummary] = useState<{ courseTitle: string; lessonTitle: string | null; completedCount: number; visibleCount: number }>({ courseTitle: "", lessonTitle: null, completedCount: 0, visibleCount: 0 });
  const [activation, setActivation] = useState<StudentActivationState | undefined>();
  const [activationError, setActivationError] = useState(false);
  const [hasActiveLab, setHasActiveLab] = useState(false);

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

      const email = user.email?.toLowerCase();

      const weeklyResult = await supabase
        .from("weekly_updates")
        .select("id,updated_at")
        .eq("student_user_id", user.id)
        .eq("week_start", getTaipeiMonday())
        .maybeSingle<{ id: string; updated_at: string }>();
      const weekly = weeklyResult.data;

      if (isMounted) setWeeklyCheckIn({ updatedAt: weekly?.updated_at ?? null });

      const { data: learningCourse } = await supabase
        .from("courses")
        .select("id,title")
        .eq("slug", "rapid4grad-core")
        .eq("is_published", true)
        .maybeSingle<{ id: string; title: string }>();
      if (learningCourse) {
        const { data: visibleLessons } = await supabase
          .from("course_lessons")
          .select("id,title,sort_order")
          .eq("course_id", learningCourse.id)
          .eq("is_published", true)
          .order("sort_order", { ascending: true });
        const lessonIds = (visibleLessons ?? []).map((lesson) => lesson.id);
        const { data: progress } = lessonIds.length
          ? await supabase.from("course_progress").select("lesson_id,status").eq("user_id", user.id).in("lesson_id", lessonIds)
          : { data: [] as Array<{ lesson_id: string; status: string }> };
        const progressByLesson = new Map((progress ?? []).map((row) => [row.lesson_id, row.status]));
        const nextLesson = (visibleLessons ?? []).find((lesson) => progressByLesson.get(lesson.id) === "in_progress") ?? (visibleLessons ?? []).find((lesson) => progressByLesson.get(lesson.id) !== "completed");
        if (isMounted) setLearningSummary({ courseTitle: learningCourse.title, lessonTitle: nextLesson?.title ?? null, completedCount: (visibleLessons ?? []).filter((lesson) => progressByLesson.get(lesson.id) === "completed").length, visibleCount: (visibleLessons ?? []).length });
      }

      const meetingsResult = await supabase
        .from("meetings")
        .select("meeting_at,status")
        .eq("student_user_id", user.id)
        .order("meeting_at", { ascending: true });
      const meetings = meetingsResult.data;
      const now = Date.now();
      const scheduled = (meetings ?? []).filter((meeting: { meeting_at: string; status: string }) => meeting.status === "scheduled");
      const nextMeeting = scheduled.find((meeting: { meeting_at: string }) => new Date(meeting.meeting_at).getTime() > now);
      if (isMounted) setMeetingSummary({
        pendingCount: scheduled.filter((meeting: { meeting_at: string }) => new Date(meeting.meeting_at).getTime() <= now).length,
        nextMeetingAt: nextMeeting?.meeting_at ?? null,
      });

      const actionsResult = await supabase.from("meeting_actions").select("due_date,status").eq("student_user_id", user.id);
      const actions = actionsResult.data;
      const membershipResult = await supabase
        .from("lab_memberships")
        .select("lab_id,joined_at,labs(status)")
        .eq("user_id", user.id)
        .eq("role", "student")
        .eq("status", "active")
        .limit(1)
        .maybeSingle<{ lab_id: string; joined_at: string; labs: { status: string } | null }>();
      const membership = membershipResult.data;
      const activeLab = membership?.labs?.status === "active";
      if (isMounted) setHasActiveLab(activeLab);
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

      const thesisResult = await supabase
        .from("thesis_milestones")
        .select("milestone_key,status,target_date,completed_at")
        .eq("student_user_id", user.id);
      const thesisRows = thesisResult.data;
      if (isMounted) {
        const activationDataFailed = Boolean(weeklyResult.error || meetingsResult.error || actionsResult.error || membershipResult.error || thesisResult.error);
        setActivationError(activationDataFailed);
        setActivation(activationDataFailed ? undefined : deriveStudentActivationState({
            hasThesisSetup: (thesisRows ?? []).length > 0,
            hasMeeting: (meetings ?? []).length > 0,
            hasCurrentWeekly: Boolean(weekly),
            hasAnyAction: (actions ?? []).length > 0,
          }));
        const thesis = getThesisProgressSummary(mergeMilestoneDefinitionsWithRows(user.id, (thesisRows ?? []) as ThesisMilestoneRow[]));
        setThesisSummary({
          currentLabel: thesis.current?.label ?? "所有論文里程碑已完成",
          completedCount: thesis.completedCount,
          blocked: thesis.current?.status === "blocked",
        });
        const signals = deriveGraduationRiskSignals({ activeLab, joinedAt: membership?.joined_at, latestWeekly: weekly ?? null, meetings: (meetings ?? []) as Array<{ status: string; meeting_at: string }>, actions: (actions ?? []) as Array<{ status: string; due_date: string | null; owner_type: string; owner_user_id: string; student_user_id: string }>, thesisMilestones: (thesisRows ?? []) as ThesisMilestoneRow[] });
        const status = deriveGraduationRiskStatus({ signals, hasThesisRows: (thesisRows ?? []).length > 0, activeLab, hasResearchData: Boolean((thesisRows ?? []).length || (meetings ?? []).length || (actions ?? []).length || weekly) });
        const primary = getPrimaryGraduationRiskSignal(signals);
        const labels = { urgent: "需要優先處理", attention: "需要注意", stable: "目前穩定", setup_needed: "資料尚未完整" } as const;
        setGraduationRisk({ status, label: labels[status], reason: primary?.title ?? (status === "setup_needed" ? "先設定論文進度或建立第一筆 Personal 研究資料" : "目前沒有明顯的進度風險") });
      }

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
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<AdvisorMemory>();

      if (isMounted) setAdvisorConfigured(Boolean(memory));

      if (isMounted) {
        setIsLoading(false);
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <StudentWorkspaceHome
      leadSummary={leadSummary}
      isLoading={isLoading}
      weeklyCheckIn={weeklyCheckIn}
      meetingSummary={meetingSummary}
      actionSummary={actionSummary}
      thesisSummary={thesisSummary}
      activation={activation}
      activationError={activationError}
      hasActiveLab={hasActiveLab}
      graduationRisk={graduationRisk}
      advisorConfigured={advisorConfigured}
      learningSummary={learningSummary}
    />
  );
}
