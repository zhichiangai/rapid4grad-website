import { notFound } from "next/navigation";
import { TestCheckoutPanel } from "@/components/course/TestCheckoutPanel";

type PageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function TestCheckoutPage({ searchParams }: PageProps) {
  if (process.env.NODE_ENV === "production") notFound();

  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : null;
  if (!token || token.length > 4096) notFound();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.2),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 py-12 text-white">
      <section className="w-full max-w-xl rounded-[2rem] border border-cyan-300/20 bg-slate-950/85 p-8 shadow-2xl shadow-cyan-950/30">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
          Local Test Provider
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          測試付款結果
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-400">
          此頁只在本機開發與自動化測試環境使用，不會收取真實款項，也不會在 Production 開放。
        </p>
        <TestCheckoutPanel token={token} />
      </section>
    </main>
  );
}
