const COURSE_PRICE = "NT$ 2,400";
const RENEWAL_PRICE = "NT$ 890 / 6 個月";

const features = [
  "研究生畢業加速課程：聚焦文獻、Meeting、簡報、寫作與工具流",
  "6 個月研究報告 AI 指令產生器權限",
  "針對 ChatGPT、Claude、Gemini、Grok 的外部 AI 使用策略",
  "教授提問模擬、邏輯漏洞檢查、簡報修正、英文潤飾指令模板",
  "適合論文題目確認、組會報告、口試前預演與初稿修改",
];

const outcomes = [
  "Meeting 前先知道教授可能會問什麼",
  "把研究報告轉成可被 AI 嚴格檢查的任務指令",
  "降低被問倒、報告失焦、文獻讀完卻不會用的風險",
];

export default function CoursePage() {
  const configuredPaymentLink =
    process.env.STRIPE_PAYMENT_LINK_COURSE?.trim() ?? "";
  const isPaymentLinkConfigured = configuredPaymentLink.startsWith("https://");
  const paymentLink = isPaymentLinkConfigured
    ? configuredPaymentLink
    : "#stripe-payment-link-not-configured";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.24),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] px-4 py-12 text-white">
      <section className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-blue-300">
            RAPID4GRAD COURSE
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            研究生畢業加速課程
            <span className="block text-blue-300">
              加上 6 個月 AI 指令產生器
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
            這不是單純教你「怎麼問 AI」。RAPID4GRAD 的重點是把研究生最常卡住的情境拆成可操作流程：
            文獻讀完要怎麼變成研究缺口、Meeting 前要怎麼預判教授追問、報告與口試前要怎麼先找出邏輯漏洞。
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {outcomes.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-slate-200"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-[2rem] border border-blue-300/20 bg-slate-950/80 p-6 shadow-2xl shadow-blue-950/30 backdrop-blur">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm font-medium text-blue-200">
              研究生畢業加速課程 + 6 個月研究報告 AI 指令產生器
            </p>
            <div className="mt-5 flex items-end gap-3">
              <span className="text-4xl font-semibold tracking-tight">
                {COURSE_PRICE}
              </span>
              <span className="pb-1 text-sm text-slate-400">一次付清</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              半年後如果還需要工具權限，可以用 {RENEWAL_PRICE} 彈性續約。
            </p>
          </div>

          <ul className="mt-6 space-y-3">
            {features.map((feature) => (
              <li
                key={feature}
                className="flex gap-3 text-sm leading-6 text-slate-200"
              >
                <span className="mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-xs text-blue-200">
                  ✓
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <a
            href={paymentLink}
            target={isPaymentLinkConfigured ? "_blank" : undefined}
            rel={isPaymentLinkConfigured ? "noopener noreferrer" : undefined}
            aria-disabled={!isPaymentLinkConfigured}
            className="mt-8 flex w-full items-center justify-center rounded-2xl bg-blue-500 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400 aria-disabled:pointer-events-none aria-disabled:bg-slate-700 aria-disabled:text-slate-300"
          >
            {isPaymentLinkConfigured ? "立即加入課程" : "Stripe 付款連結尚未設定"}
          </a>

          <p className="mt-4 text-center text-xs leading-5 text-slate-500">
            付款成功後，系統將透過 Stripe Webhook 自動開通課程與工具權限。
          </p>
        </aside>
      </section>

      <section className="mx-auto mt-12 grid w-full max-w-6xl gap-4 md:grid-cols-3">
        {[
          ["適合誰", "正在準備組會、Meeting、口試或論文初稿的研究生。"],
          ["核心工具", "不是替你寫論文，而是幫你產生更嚴謹的外部 AI 分析指令。"],
          ["開通方式", "Stripe 付款完成後，由 webhook 寫入權限，不需要人工手動開通。"],
        ].map(([title, body]) => (
          <div
            key={title}
            className="rounded-3xl border border-white/10 bg-white/[0.035] p-5"
          >
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
