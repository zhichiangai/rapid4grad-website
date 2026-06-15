import { contentAnalytics } from '@/lib/growth-dashboard';

export default function ContentAnalyticsPage() {
  return (
    <section className="grid gap-5">
      <article className="rounded-[36px] border border-white/70 bg-white/88 p-6 shadow-[0_20px_60px_rgba(16,32,58,0.08)]">
        <div className="text-xs font-bold tracking-[0.16em] text-[#2144b2]">Content Analytics</div>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-[#10203a]">內容分析預留頁</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#62708d]">先把資料結構留好，之後可以看哪個頁面帶來最多診斷、最多完成、最高轉換。</p>
      </article>

      <article className="grid gap-4 xl:grid-cols-5">
        {contentAnalytics.map((item) => (
          <div key={item.page} className="rounded-[30px] border border-white/70 bg-white/88 p-5 shadow-[0_20px_60px_rgba(16,32,58,0.08)]">
            <div className="text-xs font-bold tracking-[0.14em] text-[#2144b2]">{item.page}</div>
            <div className="mt-3 text-lg font-black text-[#10203a]">帶來診斷：{item.diagnosis}</div>
            <div className="mt-2 text-sm font-semibold text-[#62708d]">完成率：{item.complete}</div>
            <p className="mt-3 text-sm leading-6 text-[#62708d]">目前最有效區塊：{item.highest}</p>
          </div>
        ))}
      </article>

      <article className="rounded-[36px] border border-white/70 bg-[linear-gradient(145deg,#315ef6_0%,#2144b2_48%,#122a79_100%)] p-6 text-white shadow-[0_20px_60px_rgba(13,35,103,0.18)]">
        <div className="text-xs font-bold tracking-[0.16em] text-white/80">下一步</div>
        <h3 className="mt-1 text-xl font-black">先串 Google Sheet，再看哪些內容真的帶來結果。</h3>
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-white/84">
          這頁先保留架構，之後可回推每個頁面、每個 CTA、每個內容區塊的實際效果。
        </p>
      </article>
    </section>
  );
}
