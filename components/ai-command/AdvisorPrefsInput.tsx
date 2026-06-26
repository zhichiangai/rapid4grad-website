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
  const appendStyleHint = (hint: string) => {
    const current = preferredStyle.trim();
    if (current.includes(hint)) return;
    onPreferredStyleChange(current ? `${current}、${hint}` : hint);
  };

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-slate-200">
          指導教授偏好（選填）
        </h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          這些資訊會被注入 prompt，讓外部 AI 更像你的指導教授在問問題。
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STYLE_HINTS.map((hint) => (
          <button
            key={hint}
            type="button"
            onClick={() => appendStyleHint(hint)}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 transition hover:border-blue-300/40 hover:text-white"
          >
            {hint}
          </button>
        ))}
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-medium text-slate-300">
          教授常問問題（一行一題）
        </span>
        <textarea
          value={frequentQuestions}
          onChange={(event) => onFrequentQuestionsChange(event.target.value)}
          rows={3}
          className="w-full resize-none rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
          placeholder="例如：你的對照組在哪裡？&#10;這個方法和前人差在哪？"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-medium text-slate-300">教授偏好風格</span>
        <input
          value={preferredStyle}
          onChange={(event) => onPreferredStyleChange(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
          placeholder="例如：重視前後邏輯、常問對照組、喜歡先講結論"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-medium text-slate-300">自訂備忘</span>
        <textarea
          value={customNote}
          onChange={(event) => onCustomNoteChange(event.target.value)}
          rows={3}
          className="w-full resize-none rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
          placeholder="補充這次 Meeting、口試或投稿最擔心的地方。"
        />
      </label>
    </section>
  );
}
