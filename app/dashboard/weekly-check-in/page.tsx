import { WeeklyCheckInForm } from "@/components/student/WeeklyCheckInForm";
import { WeeklyCheckInHistory } from "@/components/student/WeeklyCheckInHistory";
import { WeeklyCheckInStatusCard } from "@/components/student/WeeklyCheckInStatusCard";
import { requireStudentWorkspace } from "@/lib/auth/authorization";
import { formatTaipeiDateTime, formatWeekRange, getTaipeiMonday } from "@/lib/supervision/week";
import { type WeeklyUpdate } from "@/lib/supervision/weekly-updates";
import { resolveStudentCapabilities } from "@/lib/student/capabilities";

export default async function WeeklyCheckInPage() {
  const context = await requireStudentWorkspace("/dashboard/weekly-check-in");
  if (context.profile.role !== "student") return null;

  const currentWeek = getTaipeiMonday();
  const [historyResult, capabilities] = await Promise.all([
    context.supabase
      .from("weekly_updates")
      .select("*")
      .eq("student_user_id", context.user.id)
      .order("week_start", { ascending: false })
      .limit(12)
      .returns<WeeklyUpdate[]>(),
    resolveStudentCapabilities(context.supabase, context.user.id),
  ]);

  if (historyResult.error) console.error("[weekly-check-in] history read failed", { code: historyResult.error.code });
  const updates = historyResult.data ?? [];
  const currentUpdate = updates.find((update) => update.week_start === currentWeek) ?? null;
  const historicalUpdates = updates.filter((update) => update.week_start !== currentWeek);
  const mode = capabilities.lab.mode;
  const currentUpdateReadOnly = Boolean(currentUpdate?.lab_id && !capabilities.lab.canShareWeekly);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.16),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 py-10 text-white">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-7 shadow-2xl shadow-cyan-950/20">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">WEEKLY RESEARCH CHECK-IN</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">本週研究進度</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">不用寫正式週報。花 1 分鐘整理這週的研究節奏，讓下一次 Meeting 更容易接續。</p>
            </div>
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.07] px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">本週</p>
              <p className="mt-1 text-sm font-semibold">{formatWeekRange(currentWeek)}</p>
              {currentUpdate ? <p className="mt-2 text-xs font-semibold text-emerald-200">✓ 已更新</p> : <p className="mt-2 text-xs text-slate-400">本週尚未更新</p>}
              {currentUpdate ? <p className="mt-1 text-xs text-slate-400">最後更新：{formatTaipeiDateTime(currentUpdate.updated_at)}</p> : null}
            </div>
          </div>
        </header>

        <WeeklyCheckInStatusCard mode={mode} hasActiveLab={capabilities.lab.hasActiveLab} hasHistory={updates.length > 0} />

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Current Week</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold">把這週整理成一個小回顧</h2>
                  {currentUpdate ? <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100">✓ 已更新</span> : <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-400">本週尚未更新</span>}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">不用完整，只要讓未來的自己知道現在走到哪裡。</p>
                {currentUpdate ? <p className="mt-2 text-xs text-slate-500">最後更新：{formatTaipeiDateTime(currentUpdate.updated_at)}</p> : null}
              </div>
              <WeeklyCheckInForm currentUpdate={currentUpdate} disabled={currentUpdateReadOnly} canShareLab={capabilities.lab.canShareWeekly} labName={capabilities.lab.labName} />
            </div>

            <aside className="space-y-4">
              <div className="rounded-[2rem] border border-cyan-300/15 bg-cyan-400/[0.06] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Sharing Note</p>
                <p className="mt-3 text-sm leading-7 text-cyan-50">這份每週進度預設只有你自己看得到；若有可用的 Lab 協作，可以在表單中選擇分享。</p>
                <p className="mt-3 text-sm leading-7 text-cyan-100/70">你的私人 PDF、原始 AI 對話與私人筆記不會因此自動分享。</p>
              </div>
              {capabilities.lab.hasActiveLab ? <div className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-6"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Active Lab</p><p className="mt-3 font-semibold text-white">{capabilities.lab.labName}</p><p className="mt-2 text-sm text-slate-400">{mode === "functional" ? "可選擇分享給 Lab" : "Lab 協作目前為唯讀，Personal Weekly 仍可更新"}</p></div> : null}
            </aside>
        </section>

        <WeeklyCheckInHistory updates={historicalUpdates} />
      </section>
    </main>
  );
}
