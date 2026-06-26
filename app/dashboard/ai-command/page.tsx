import { AiCommandContainer } from "@/components/ai-command/AiCommandContainer";

export default function AiCommandPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <header className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-blue-950/20">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">
            RAPID4GRAD TOOL
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            🎓 研究報告 AI 指令產生器
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            不需要在 RAPID 上傳 PDF，也不消耗後端 AI API。選擇你的研究情境，產生可直接貼到 ChatGPT、Claude、Gemini 或 Grok 的高品質學術指令。
          </p>
        </header>
      </div>

      <AiCommandContainer />
    </main>
  );
}
