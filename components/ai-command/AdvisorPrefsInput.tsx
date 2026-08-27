"use client";

interface AdvisorPrefsInputProps {
  frequentQuestions: string;
  preferredStyle: string;
  customNote: string;
  onFrequentQuestionsChange: (value: string) => void;
  onPreferredStyleChange: (value: string) => void;
  onCustomNoteChange: (value: string) => void;
}

const STYLE_HINTS = [
  "重視前後邏輯",
  "常問對照組",
  "重視研究缺口",
  "喜歡先講結論",
  "常挑圖表說明",
  "在意實驗限制",
];

export function AdvisorPrefsInput({
  frequentQuestions,
  preferredStyle,
  customNote,
  onFrequentQuestionsChange,
  onPreferredStyleChange,
  onCustomNoteChange,
}: AdvisorPrefsInputProps) {
  const selectedStyles = preferredStyle.split("、").map((style) => style.trim()).filter(Boolean);

  const toggleStyle = (style: string) => {
    const next = selectedStyles.includes(style)
      ? selectedStyles.filter((item) => item !== style)
      : [...selectedStyles, style];
    onPreferredStyleChange(next.join("、"));
  };

  return (
    <details className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <summary className="cursor-pointer list-none">
        <span className="text-sm font-semibold text-white">提高準確度（選填）</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          如果你的教授有固定的提問習慣，可以補充在這裡。
        </span>
      </summary>
      <div className="mt-5 space-y-4">
        <fieldset>
          <legend className="text-xs font-medium text-slate-300">教授特別在意什麼？</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {STYLE_HINTS.map((style) => {
              const selected = selectedStyles.includes(style);
              return (
                <button
                  key={style}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleStyle(style)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${selected ? "border-cyan-300/60 bg-cyan-400/15 text-cyan-50" : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/40 hover:text-white"}`}
                >
                  {style}
                </button>
              );
            })}
          </div>
        </fieldset>
        <label className="block space-y-2">
          <span className="text-xs font-medium text-slate-300">教授常問你的問題</span>
          <textarea value={frequentQuestions} onChange={(event) => onFrequentQuestionsChange(event.target.value)} rows={3} className="w-full resize-none rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20" placeholder={'例如：\n你的對照組在哪裡？\n這個方法和前人差在哪？'} />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-medium text-slate-300">其他補充</span>
          <textarea value={customNote} onChange={(event) => onCustomNoteChange(event.target.value)} rows={3} className="w-full resize-none rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20" placeholder="例如：這次 Meeting 最擔心老師質疑研究方法。" />
        </label>
      </div>
    </details>
  );
}
