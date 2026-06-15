import { eventHighlights, overviewKpis, adminSummaryNotes } from '@/lib/growth-dashboard';

export default function AdminDashboardPage() {
  return (
    <section className="grid gap-5">
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <article className="rounded-[36px] border border-white/70 bg-white/88 p-6 shadow-[0_20px_60px_rgba(16,32,58,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold tracking-[0.16em] text-[#2144b2]">Overview</div>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-[#10203a]">今天先看四件事</h2>
            </div>
            <div className="rounded-full border border-[#dbe6ff] bg-[#f8faff] px-3 py-1 text-xs font-semibold text-[#2144b2]">
              Google Sheet / Apps Script
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {overviewKpis.map((item) => (
              <div key={item.label} className="rounded-[28px] border border-[#dbe6ff] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] p-4">
                <div className="text-xs font-bold tracking-[0.14em] text-[#2144b2]">{item.label}</div>
                <div className="mt-2 text-3xl font-black text-[#10203a]">{item.value}</div>
                <div className="mt-2 text-xs font-semibold text-[#29a06f]">{item.delta}</div>
                <p className="mt-2 text-sm leading-6 text-[#62708d]">{item.note}</p>
              </div>
            ))}
          </div>
        </article>

        <aside className="rounded-[36px] border border-white/70 bg-[linear-gradient(145deg,#315ef6_0%,#2144b2_48%,#122a79_100%)] p-6 text-white shadow-[0_20px_60px_rgba(13,35,103,0.18)]">
          <div className="inline-flex rounded-full border border-white/16 bg-white/12 px-3 py-1 text-xs font-bold tracking-[0.14em]">
            今日決策重點
          </div>
          <div className="mt-4 grid gap-3">
            {adminSummaryNotes.map((note, index) => (
              <div key={note} className="rounded-[24px] border border-white/12 bg-white/10 p-4 backdrop-blur">
                <div className="text-xs font-bold text-white/72">0{index + 1}</div>
                <p className="mt-2 text-sm leading-7 text-white/88">{note}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[36px] border border-white/70 bg-white/88 p-6 shadow-[0_20px_60px_rgba(16,32,58,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold tracking-[0.16em] text-[#2144b2]">漏斗快照</div>
              <h3 className="mt-1 text-xl font-black text-[#10203a]">目前最值得盯的流失點</h3>
            </div>
            <div className="rounded-full bg-[#e9efff] px-3 py-1 text-xs font-semibold text-[#2144b2]">Homepage → Result</div>
          </div>

          <div className="mt-5 grid gap-4">
            {eventHighlights.map((item) => (
              <div key={item.event} className="rounded-[26px] border border-[#dbe6ff] bg-[#f8faff] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold tracking-[0.14em] text-[#2144b2]">{item.event}</div>
                    <p className="mt-2 text-sm leading-7 text-[#20304b]">{item.note}</p>
                  </div>
                  <div className="text-2xl font-black text-[#10203a]">{item.count.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[36px] border border-white/70 bg-white/88 p-6 shadow-[0_20px_60px_rgba(16,32,58,0.08)]">
          <div className="text-xs font-bold tracking-[0.16em] text-[#2144b2]">今天要做什麼</div>
          <h3 className="mt-1 text-xl font-black text-[#10203a]">先處理流失最高的那一步</h3>
          <div className="mt-5 grid gap-3">
            {[
              '檢查 homepage_view 到 diagnosis_start 的 CTA 表現',
              '查看 diagnosis_start 到 diagnosis_submit 的表單摩擦',
              '對 result_view 比例低的內容區做 A/B 測試',
              '整理一份本週最常見卡點清單'
            ].map((item) => (
              <div key={item} className="rounded-[24px] border border-[#dbe6ff] bg-[#f8faff] p-4 text-sm leading-7 text-[#20304b]">
                {item}
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
