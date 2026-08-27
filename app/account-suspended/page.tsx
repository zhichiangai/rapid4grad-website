import { createV2Client } from "@/lib/supabase/server";

export default async function AccountSuspendedPage() {
  async function signOut() {
    "use server";
    const supabase = await createV2Client();
    await supabase.auth.signOut();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-amber-400/20 bg-slate-900/80 p-8 text-center shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">Account access</p>
        <h1 className="mt-4 text-3xl font-semibold">帳號目前暫停使用</h1>
        <p className="mt-4 leading-7 text-slate-300">請聯絡 RAPID4GRAD 管理團隊確認帳號狀態。恢復使用前，受保護的工作區與 API 不會開放。</p>
        <form action={signOut} className="mt-8">
          <button type="submit" className="rounded-full bg-slate-700 px-6 py-3 font-medium text-white transition hover:bg-slate-600">登出</button>
        </form>
      </section>
    </main>
  );
}
