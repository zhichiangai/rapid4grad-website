export default function AiAuditHistoryLoading() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_32rem),linear-gradient(180deg,#020617_0%,#0f172a_55%,#020617_100%)] px-4 py-10 text-white">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="animate-pulse rounded-[2rem] border border-white/10 bg-slate-950/70 p-7">
          <div className="h-3 w-36 rounded-full bg-white/10" />
          <div className="mt-4 h-10 w-80 rounded-full bg-white/10" />
          <div className="mt-4 h-4 w-full max-w-3xl rounded-full bg-white/10" />
          <div className="mt-2 h-4 w-full max-w-2xl rounded-full bg-white/10" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="animate-pulse rounded-[2rem] border border-white/10 bg-slate-950/70 p-6">
            <div className="h-6 w-40 rounded-full bg-white/10" />
            <div className="mt-6 space-y-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="grid grid-cols-7 gap-3 rounded-2xl border border-white/6 bg-white/[0.03] p-4"
                >
                  <div className="col-span-2 h-4 rounded-full bg-white/10" />
                  <div className="h-4 rounded-full bg-white/10" />
                  <div className="h-4 rounded-full bg-white/10" />
                  <div className="h-4 rounded-full bg-white/10" />
                  <div className="h-4 rounded-full bg-white/10" />
                  <div className="h-4 rounded-full bg-white/10" />
                </div>
              ))}
            </div>
          </div>

          <div className="animate-pulse rounded-[2rem] border border-white/10 bg-slate-950/70 p-6">
            <div className="h-4 w-32 rounded-full bg-white/10" />
            <div className="mt-4 h-8 w-64 rounded-full bg-white/10" />
            <div className="mt-6 h-36 rounded-[1.5rem] bg-white/10" />
            <div className="mt-5 h-72 rounded-[1.5rem] bg-white/10" />
          </div>
        </div>
      </section>
    </main>
  );
}
