import { redirect } from "next/navigation";
import { PaymentStatusPanel } from "@/components/course/PaymentStatusPanel";
import { createV2Client } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ orderId?: string | string[] }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function PaymentSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const orderId = typeof params.orderId === "string" ? params.orderId : "";
  const supabase = await createV2Client();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = orderId
      ? `/payment/success?orderId=${encodeURIComponent(orderId)}`
      : "/payment/success";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  if (!UUID_PATTERN.test(orderId)) redirect("/course");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.22),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 text-white">
      <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 text-center shadow-2xl shadow-cyan-950/30">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
          Payment Status
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          確認課程開通狀態
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-400">
          系統只會在收到並驗證付款通知後，建立永久 course_full 權限。
        </p>
        <PaymentStatusPanel orderId={orderId} />
      </section>
    </main>
  );
}
