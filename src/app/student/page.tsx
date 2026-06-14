import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';

const items = [
  {
    title: '先做免費診斷',
    desc: '先把你的研究狀態說清楚，再讓系統幫你排序。',
    href: '/diagnosis'
  },
  {
    title: '打開 Free Tools',
    desc: '先用三個工具快速拿到 Summary、Action Items、Next Step。',
    href: '/tools'
  },
  {
    title: '看 Student Dashboard',
    desc: '回來看今天該做什麼、本週該做什麼。',
    href: '/dashboard'
  }
];

export default function StudentPage() {
  return (
    <SiteShell>
      <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <article className="rounded-[38px] border border-[#dbe6ff] bg-[linear-gradient(140deg,#315ef6_0%,#2144b2_52%,#122a79_100%)] p-7 text-white shadow-[0_28px_60px_rgba(13,35,103,0.26)] sm:p-10 lg:p-12">
          <div className="inline-flex rounded-full border border-white/18 bg-white/12 px-4 py-1 text-xs font-semibold tracking-[0.16em] text-white/92">
            我是學生
          </div>
          <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[0.92] tracking-tight sm:text-5xl lg:text-6xl">
            先看清楚你現在卡在哪裡。
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-8 text-white/84">
            如果你現在最需要的是下一步，從診斷、工具到 Dashboard，RAPID 會先幫你把研究流程整理成可執行動作。
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/diagnosis" className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-extrabold text-[#173aac]">
              開始免費診斷
            </Link>
            <Link href="/tools" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/18 bg-white/10 px-6 text-sm font-bold text-white">
              先看 Free Tools
            </Link>
          </div>
        </article>

        <aside className="grid gap-4">
          <div className="rounded-[34px] border border-[#dbe6ff] bg-white p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
            <div className="text-sm font-bold text-[#2144b2]">你會先得到什麼</div>
            <ul className="mt-4 grid gap-3 text-sm leading-7 text-[#20304b]">
              <li className="rounded-[22px] bg-[#f8faff] p-4">你現在最該先處理哪一塊</li>
              <li className="rounded-[22px] bg-[#f8faff] p-4">下次 Meeting 要問什麼</li>
              <li className="rounded-[22px] bg-[#f8faff] p-4">這週先做哪三件事</li>
            </ul>
          </div>
          <div className="rounded-[34px] border border-[#dbe6ff] bg-[#f8faff] p-6 shadow-[0_18px_44px_rgba(16,32,58,0.08)]">
            <div className="text-sm font-bold text-[#2144b2]">接下來的路徑</div>
            <div className="mt-4 grid gap-3">
              {items.map((item, index) => (
                <Link key={item.title} href={item.href} className="rounded-[24px] border border-[#dbe6ff] bg-white p-4">
                  <div className="text-xs font-bold text-[#2860f2]">0{index + 1}</div>
                  <div className="mt-1 text-lg font-extrabold text-[#10203a]">{item.title}</div>
                  <p className="mt-2 text-sm leading-6 text-[#62708d]">{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </SiteShell>
  );
}
