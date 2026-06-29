import Link from "next/link";

export default function PaymentSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.22),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 text-white">
      <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 text-center shadow-2xl shadow-blue-950/30">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">
          Payment Processing
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          付款狀態處理中
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-400">
          如果付款已完成，系統會在收到金流通知後開通課程權限。你可以稍後回到
          Dashboard 查看狀態。
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400"
          >
            回 Dashboard
          </Link>
          <Link
            href="/course"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]"
          >
            回課程頁
          </Link>
        </div>
      </section>
    </main>
  );
}
