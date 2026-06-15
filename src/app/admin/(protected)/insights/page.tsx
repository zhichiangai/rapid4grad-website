import { insightBlocks, segmentComparison } from '@/lib/growth-dashboard';

export default function InsightsPage() {
  return (
    <section className="grid gap-5">
      <article className="rounded-[36px] border border-white/70 bg-white/88 p-6 shadow-[0_20px_60px_rgba(16,32,58,0.08)]">
        <div className="text-xs font-bold tracking-[0.16em] text-[#2144b2]">Insights Dashboard</div>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-[#10203a]">產品洞察</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#62708d]">這一頁幫你決定下一步要做什麼內容，不碰 CRM、不碰成交紀錄。</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {insightBlocks.map((item) => (
            <div key={item.title} className="rounded-[28px] border border-[#dbe6ff] bg-[#f8faff] p-4">
              <div className="text-xs font-bold tracking-[0.14em] text-[#2144b2]">{item.title}</div>
              <div className="mt-2 text-2xl font-black text-[#10203a]">{item.value}</div>
              <p className="mt-2 text-sm leading-6 text-[#62708d]">{item.desc}</p>
            </div>
          ))}
        </div>
      </article>

      <div className="grid gap-5 xl:grid-cols-2">
        {segmentComparison.map((segment) => (
          <article key={segment.label} className="rounded-[36px] border border-white/70 bg-white/88 p-6 shadow-[0_20px_60px_rgba(16,32,58,0.08)]">
            <div className="text-xs font-bold tracking-[0.16em] text-[#2144b2]">{segment.label}</div>
            <h3 className="mt-1 text-xl font-black text-[#10203a]">這群人最常在意什麼？</h3>
            <div className="mt-5 grid gap-3">
              {segment.metrics.map((metric) => (
                <div key={metric} className="rounded-[24px] border border-[#dbe6ff] bg-[#f8faff] p-4 text-sm leading-7 text-[#20304b]">
                  {metric}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
