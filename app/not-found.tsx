import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.2),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 text-white">
      <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 text-center shadow-2xl shadow-blue-950/30">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">
          404 Not Found
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          這個頁面不存在
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-400">
          你可能輸入了錯誤網址，或這個頁面目前還沒有公開。可以回到首頁重新進入 RAPID4GRAD。
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400"
          >
            回首頁
          </Link>
          <Link
            href="/quiz"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]"
          >
            做 7 題檢查
          </Link>
        </div>
      </section>
    </main>
  );
}
