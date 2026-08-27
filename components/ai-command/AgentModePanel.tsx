"use client";

import type { AgentTask } from "@/lib/prompt-builder/agent-pack-types";
import { AGENT_TASK_OPTIONS } from "@/lib/prompt-builder/agent-pack-config";

interface AgentModePanelProps {
  task: AgentTask;
  context: string;
  workingPath: string;
  constraints: string;
  isSubmitting: boolean;
  onTaskChange: (value: AgentTask) => void;
  onContextChange: (value: string) => void;
  onWorkingPathChange: (value: string) => void;
  onConstraintsChange: (value: string) => void;
  onGenerate: () => void;
}

export function AgentModePanel({ task, context, workingPath, constraints, isSubmitting, onTaskChange, onContextChange, onWorkingPathChange, onConstraintsChange, onGenerate }: AgentModePanelProps) {
  return (
    <div className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="text-lg font-semibold text-white">你要讓 Agent 完成什麼？</legend>
        <p className="text-sm text-slate-400">RAPID 會依研究任務挑選能力，並準備五個 Agent 平台可用的執行包。</p>
        <div className="flex flex-wrap gap-2">
          {AGENT_TASK_OPTIONS.map((option) => (
            <button key={option.value} type="button" aria-pressed={task === option.value} onClick={() => onTaskChange(option.value)} className={`rounded-full border px-3 py-2 text-sm transition ${task === option.value ? "border-cyan-300 bg-cyan-400/15 text-cyan-50" : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-300/40"}`}>
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-sm font-medium text-slate-200">告訴 Agent 你要完成什麼（選填）</span>
        <textarea value={context} onChange={(event) => onContextChange(event.target.value)} rows={4} maxLength={1500} className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60" placeholder="例如：請先閱讀我的文獻資料，整理研究缺口，並產出下一次與教授討論的問題清單。" />
        <span className="mt-1 block text-right text-xs text-slate-600">{context.length} / 1500</span>
      </label>

      <details className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-white">進階設定</summary>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-200">工作目錄 / 檔案提示</span>
            <input value={workingPath} onChange={(event) => onWorkingPathChange(event.target.value)} maxLength={500} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60" placeholder="例如：./paper/ ./data/ ./src/" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-200">額外限制</span>
            <textarea value={constraints} onChange={(event) => onConstraintsChange(event.target.value)} maxLength={1000} rows={3} className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60" placeholder="不要修改原始數據，所有推論都要標示證據來源。" />
          </label>
        </div>
      </details>

      <button type="button" onClick={onGenerate} disabled={isSubmitting} className="w-full rounded-2xl bg-cyan-500 px-5 py-4 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70">
        {isSubmitting ? "正在準備 Agent 與研究 Skills..." : "產生 Agent 執行包"}
      </button>
    </div>
  );
}
