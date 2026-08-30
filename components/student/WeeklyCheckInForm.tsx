"use client";

import { useActionState } from "react";
import { saveWeeklyCheckIn, type WeeklyActionState } from "@/app/dashboard/weekly-check-in/actions";
import { weeklyHelpOptions, weeklyStatuses, type WeeklyUpdate } from "@/lib/supervision/weekly-updates";

type WeeklyCheckInFormProps = {
  currentUpdate: WeeklyUpdate | null;
  disabled: boolean;
};

const initialState: WeeklyActionState = { status: "idle", message: "" };

export function WeeklyCheckInForm({ currentUpdate, disabled }: WeeklyCheckInFormProps) {
  const [state, formAction, isPending] = useActionState(saveWeeklyCheckIn, initialState);
  return (
    <form action={formAction} className="space-y-7">
      <label className="block">
        <span className="text-sm font-semibold text-white">1. 這週完成了什麼？</span>
        <span className="mt-2 block text-xs leading-5 text-slate-400">列出最重要的 1–3 件事即可，不用寫成正式報告。</span>
        <textarea name="completed_summary" required maxLength={2000} rows={5} defaultValue={currentUpdate?.completed_summary ?? ""} disabled={disabled || isPending} className="mt-3 w-full resize-y rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:cursor-not-allowed disabled:opacity-50" placeholder="例如：完成 Na 系列 RDF 分析；重跑 300 K trajectory；整理 Figure 3 初版。" />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-white">2. 目前最大的卡點是什麼？</span>
        <span className="mt-2 block text-xs leading-5 text-slate-400">沒有明顯卡點可以留空。</span>
        <textarea name="blockers" maxLength={2000} rows={4} defaultValue={currentUpdate?.blockers ?? ""} disabled={disabled || isPending} className="mt-3 w-full resize-y rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:cursor-not-allowed disabled:opacity-50" placeholder="例如：K 系列結果和預期差很多，目前還不確定原因。" />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-white">3. 下週最重要的下一步？</span>
        <span className="mt-2 block text-xs leading-5 text-slate-400">只寫最重要的下一步，避免列成十幾個待辦。</span>
        <textarea name="next_plan" required maxLength={2000} rows={4} defaultValue={currentUpdate?.next_plan ?? ""} disabled={disabled || isPending} className="mt-3 w-full resize-y rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:cursor-not-allowed disabled:opacity-50" placeholder="例如：先確認 K 系列 RDF 異常來源，再決定是否重跑整組 simulation。" />
      </label>

      <fieldset>
        <legend className="text-sm font-semibold text-white">目前研究狀態</legend>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {weeklyStatuses.map((option) => (
            <label key={option.value} className="cursor-pointer rounded-2xl border border-white/10 bg-slate-950/50 p-4 transition has-[:checked]:border-emerald-300/60 has-[:checked]:bg-emerald-400/10 focus-within:ring-2 focus-within:ring-cyan-300/70">
              <input className="sr-only" type="radio" name="self_status" value={option.value} defaultChecked={currentUpdate?.self_status === option.value} required disabled={disabled || isPending} />
              <span className="flex items-center justify-between gap-2 font-semibold text-white"><span>{option.label}</span><span aria-hidden="true">✓</span></span>
              <span className="mt-2 block text-xs leading-5 text-slate-400">{option.description}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-white">需要教授協助嗎？</legend>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {weeklyHelpOptions.map((option) => (
            <label key={option.value} className="cursor-pointer rounded-2xl border border-white/10 bg-slate-950/50 p-4 transition has-[:checked]:border-cyan-300/60 has-[:checked]:bg-cyan-400/10 focus-within:ring-2 focus-within:ring-cyan-300/70">
              <input className="sr-only" type="radio" name="needs_professor_help" value={option.value} defaultChecked={currentUpdate?.needs_professor_help === option.value} required disabled={disabled || isPending} />
              <span className="font-semibold text-white">{option.label}</span>
              <span className="mt-2 block text-xs leading-5 text-slate-400">{option.description}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {!disabled ? <button type="submit" disabled={isPending} className="w-full rounded-2xl bg-blue-500 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60">{isPending ? "儲存中..." : currentUpdate ? "更新本週進度" : "提交本週進度"}</button> : null}
      {state.message ? <p role={state.status === "error" ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${state.status === "error" ? "border-red-300/20 bg-red-400/10 text-red-100" : "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"}`}>{state.message}</p> : null}
    </form>
  );
}
