import { SiteShell } from '@/components/site-shell';

const tools = [
  {
    name: 'ChatGPT',
    description: '適合摘要、發想研究假設、草稿撰寫與語句修整。'
  },
  {
    name: 'Claude',
    description: '適合長文理解、論文內容整理與複雜脈絡推理。'
  },
  {
    name: 'Gemini',
    description: '適合搭配 Google 文件、Gmail 與日常工作流。'
  },
  {
    name: 'SciSpace / Elicit',
    description: '適合文獻搜尋、精讀、整理研究脈絡。'
  }
];

export default function ThesisWritingPage() {
  return (
    <SiteShell>
      <section className="rounded-[38px] border border-[#dbe6ff] bg-white p-7 shadow-[0_18px_44px_rgba(16,32,58,0.08)] sm:p-10">
        <div className="inline-flex rounded-full bg-[#e9efff] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#2144b2]">
          AI Tools
        </div>
        <h1 className="mt-5 text-4xl font-black tracking-tight text-[#10203a]">研究生 AI 工具指南</h1>
        <p className="mt-4 max-w-3xl text-[17px] leading-8 text-[#62708d]">
          這頁保留舊內容中最有價值的部分，把 AI 工具重新整理成研究流程的一部分。
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {tools.map((tool) => (
            <article key={tool.name} className="rounded-[28px] border border-[#dbe6ff] bg-[#f8faff] p-6">
              <h2 className="text-2xl font-extrabold text-[#2144b2]">{tool.name}</h2>
              <p className="mt-3 leading-7 text-[#20304b]">{tool.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ['寫作', '把段落草稿、文法與語氣先整理好'],
            ['文獻', '先建立脈絡，再開始深入精讀'],
            ['整理', '把筆記、圖表與任務拆成可管理步驟']
          ].map(([title, desc]) => (
            <div key={title} className="rounded-[24px] border border-[#dbe6ff] bg-white p-5 shadow-[0_10px_18px_rgba(18,39,92,0.04)]">
              <div className="text-sm font-bold text-[#2144b2]">{title}</div>
              <p className="mt-2 text-sm leading-7 text-[#62708d]">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
