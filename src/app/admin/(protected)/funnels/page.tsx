import { funnelStages } from '@/lib/growth-dashboard';

export default function FunnelsPage() {
  return (
    <section className="grid gap-5">
      <article className="rounded-[36px] border border-white/70 bg-white/88 p-6 shadow-[0_20px_60px_rgba(16,32,58,0.08)]">
        <div className="text-xs font-bold tracking-[0.16em] text-[#2144b2]">Funnel Analytics</div>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-[#10203a]">漏斗哪一段最容易掉人？</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#62708d]">先看人數，再看轉換，再看流失。這一頁只回答漏斗是否健康。</p>

        <div className="mt-6 grid gap-4">
          {funnelStages.map((stage, index) => (
            <div key={stage.name} className="rounded-[28px] border border-[#dbe6ff] bg-[#f8faff] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-xs font-bold tracking-[0.14em] text-[#2144b2]">0{index + 1}</div>
                  <div className="mt-1 text-lg font-black text-[#10203a]">{stage.name}</div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-white px-3 py-1 text-[#2144b2]">人數 {stage.value}</span>
                  <span className="rounded-full bg-white px-3 py-1 text-[#2144b2]">轉換 {stage.rate}</span>
                  <span className="rounded-full bg-white px-3 py-1 text-[#b23d66]">流失 {stage.dropoff}</span>
                </div>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#315ef6,#2144b2)]" style={{ width: stage.rate }} />
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-[36px] border border-white/70 bg-white/88 p-6 shadow-[0_20px_60px_rgba(16,32,58,0.08)]">
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            ['最大流失點', 'Homepage → Diagnosis Start', '需要先優化首頁 CTA 與診斷入口'],
            ['第二流失點', 'Diagnosis Start → Submit', '需要再降低表單摩擦'],
            ['第三流失點', 'Complete → Result View', '結果頁要更快讓人看到價值']
          ].map(([title, label, desc]) => (
            <div key={title} className="rounded-[28px] border border-[#dbe6ff] bg-[#f8faff] p-4">
              <div className="text-xs font-bold tracking-[0.14em] text-[#2144b2]">{title}</div>
              <div className="mt-2 text-lg font-black text-[#10203a]">{label}</div>
              <p className="mt-2 text-sm leading-7 text-[#62708d]">{desc}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
