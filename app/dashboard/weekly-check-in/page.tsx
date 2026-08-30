import { WeeklyCheckInForm } from "@/components/student/WeeklyCheckInForm";
import { WeeklyCheckInHistory } from "@/components/student/WeeklyCheckInHistory";
import { WeeklyCheckInStatusCard } from "@/components/student/WeeklyCheckInStatusCard";
import { requireStudentWorkspace } from "@/lib/auth/authorization";
import { createV2AdminClient } from "@/lib/supabase/server";
import { formatWeekRange, getTaipeiMonday } from "@/lib/supervision/week";
import { isFunctionalSubscription, type WeeklyUpdate } from "@/lib/supervision/weekly-updates";

type Membership = { lab_id: string; labs: { id: string; name: string; status: string } | null };
type Subscription = { status: string; current_period_start: string; current_period_end: string; grace_ends_at: string | null };

export default async function WeeklyCheckInPage() {
  const context = await requireStudentWorkspace("/dashboard/weekly-check-in");
  if (context.profile.role !== "student") return null;
  const currentWeek = getTaipeiMonday();
  const [historyResult, membershipResult] = await Promise.all([
    context.supabase.from("weekly_updates").select("*").eq("student_user_id", context.user.id).order("week_start", { ascending: false }).limit(12).returns<WeeklyUpdate[]>(),
    context.supabase.from("lab_memberships").select("lab_id,labs(id,name,status)").eq("user_id", context.user.id).eq("role", "student").eq("status", "active").limit(1).maybeSingle<Membership>(),
  ]);
  if (historyResult.error) console.error("[weekly-check-in] history read failed", { code: historyResult.error.code });
  if (membershipResult.error) console.error("[weekly-check-in] membership read failed", { code: membershipResult.error.code });
  const updates = historyResult.data ?? [];
  const currentUpdate = updates.find((update) => update.week_start === currentWeek) ?? null;
  const activeLab = membershipResult.data?.labs?.status === "active" ? membershipResult.data : null;
  let mode: "functional" | "read_only" | "none" = "none";
  if (activeLab) {
    const admin = createV2AdminClient();
    const { data: subscription } = await admin.from("subscriptions").select("status,current_period_start,current_period_end,grace_ends_at").eq("lab_id", activeLab.lab_id).order("current_period_end", { ascending: false }).limit(1).maybeSingle<Subscription>();
    mode = isFunctionalSubscription(subscription) ? "functional" : "read_only";
  }
  const historicalUpdates = updates.filter((update) => update.week_start !== currentWeek);
  const canWrite = Boolean(activeLab && mode === "functional");

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.16),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 py-10 text-white"><section className="mx-auto w-full max-w-6xl space-y-6"><header className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-7 shadow-2xl shadow-cyan-950/20"><p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">WEEKLY RESEARCH CHECK-IN</p><div className="mt-4 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight">本週研究進度</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">不用寫正式週報。花 1 分鐘整理這週的研究節奏，讓下一次 Meeting 更容易接續。</p></div><div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.07] px-4 py-3 text-right"><p className="text-xs uppercase tracking-[0.18em] text-cyan-200">本週</p><p className="mt-1 text-sm font-semibold">{formatWeekRange(currentWeek)}</p></div></div></header><WeeklyCheckInStatusCard mode={mode} hasActiveLab={Boolean(activeLab)} hasHistory={updates.length > 0} />{mode !== "none" || activeLab ? <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]"><div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6"><div className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Current Week</p><h2 className="mt-3 text-2xl font-semibold">把這週整理成一個小回顧</h2><p className="mt-2 text-sm leading-6 text-slate-400">不用完整，只要讓未來的自己知道現在走到哪裡。</p></div><WeeklyCheckInForm currentUpdate={currentUpdate} disabled={!canWrite} /></div><aside className="space-y-4"><div className="rounded-[2rem] border border-cyan-300/15 bg-cyan-400/[0.06] p-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Sharing Note</p><p className="mt-3 text-sm leading-7 text-cyan-50">提交後，這份每週進度會成為你所在 Lab 的研究指導資料，供有權限的教授 / Assistant 查看。</p><p className="mt-3 text-sm leading-7 text-cyan-100/70">你的私人 PDF、原始 AI 對話與私人筆記不會因此自動分享。</p></div>{activeLab ? <div className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-6"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Active Lab</p><p className="mt-3 font-semibold text-white">{activeLab.labs?.name}</p><p className="mt-2 text-sm text-slate-400">{mode === "functional" ? "可提交本週進度" : "目前為唯讀模式"}</p></div> : null}</aside></section> : null}<WeeklyCheckInHistory updates={historicalUpdates} /></section></main>;
}
