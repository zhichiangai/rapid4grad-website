import Link from "next/link";

export default function PaymentFailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 text-white">
      <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 text-center shadow-2xl shadow-amber-950/20">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">
          Payment Not Completed
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          付款未完成
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-400">
          付款可能已取消、失敗或尚未完成。你可以回到課程頁重新嘗試，或稍後聯繫我們協助確認。
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/course"
            className="rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400"
          >
            回課程頁
          </Link>
          <Link
            href="/consultation"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]"
          >
            聯繫協助
          </Link>
        </div>
      </section>
    </main>
  );
}
