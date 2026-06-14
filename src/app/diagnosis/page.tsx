import { SiteShell } from '@/components/site-shell';
import { DiagnosisForm } from '@/components/diagnosis-form';
import Link from 'next/link';

const benefits = [
  '先知道目前風險高不高',
  '直接看到本週該做的事',
  '不用填太多，也能先開始'
];

export default function DiagnosisPage() {
  return (
    <SiteShell>
      <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
        <article className="relative overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(140deg,#315ef6_0%,#2144b2_52%,#122a79_100%)] p-7 text-white shadow-[0_28px_60px_rgba(13,35,103,0.26)] sm:p-10 lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.14),transparent_24%),radial-gradient(circle_at_72%_22%,rgba(141,182,255,0.22),transparent_18%),radial-gradient(circle_at_72%_82%,rgba(11,21,59,0.16),transparent_24%)]" />
          <div className="relative">
            <div className="inline-flex rounded-full border border-white/18 bg-white/12 px-4 py-1 text-xs font-semibold tracking-[0.16em] text-white/92">
              免費診斷
            </div>
            <h1 className="mt-5 max-w-xl text-4xl font-black leading-[0.92] tracking-tight sm:text-5xl">
              先開始，幾個問題就能看到你的風險。
            </h1>
            <p className="mt-5 max-w-2xl text-[17px] leading-8 text-white/84">
              這份診斷會直接告訴你現在該先處理什麼。姓名與 Email 都可以先不填，先把研究狀態說清楚就能開始。
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {benefits.map((item) => (
                <div key={item} className="rounded-[24px] border border-white/12 bg-white/10 p-4 backdrop-blur">
                  <p className="text-sm leading-7 text-white/88">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </article>

        <div className="rounded-[38px] border border-[#dbe6ff] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] p-4 shadow-[0_18px_44px_rgba(16,32,58,0.08)] sm:p-6">
          <div className="mb-5 rounded-[28px] border border-[#dbe6ff] bg-[#f7f9ff] px-5 py-4">
            <div className="text-sm font-bold text-[#2144b2]">完成後你會得到什麼</div>
            <ul className="mt-2 grid gap-2 text-sm leading-7 text-[#62708d]">
              <li>風險等級與主要卡點</li>
              <li>本週三件事</li>
              <li>可直接回 Dashboard 的下一步</li>
            </ul>
          </div>
          <div className="mb-5 rounded-[28px] border border-[#dbe6ff] bg-white px-5 py-4">
            <div className="text-sm font-bold text-[#2144b2]">先試 Free Tools</div>
            <p className="mt-2 text-sm leading-7 text-[#62708d]">
              如果你只想先快速看出風險，可以先到免費工具頁直接操作。
            </p>
            <Link
              href="/tools"
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#315ef6,#2144b2)] px-5 text-sm font-bold text-white"
            >
              打開 Free Tools
            </Link>
          </div>
          <DiagnosisForm />
        </div>
      </section>
    </SiteShell>
  );
}
