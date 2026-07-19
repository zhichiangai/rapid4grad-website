import { CourseCheckoutButton } from "@/components/course/CourseCheckoutButton";
import { getConfiguredDatabaseProviderName } from "@/lib/payments";
import { createV2Client } from "@/lib/supabase/server";

const features = [
  "RAPID 五大課程模組：Research、Application、Presentation、Interpersonal、Direction",
  "完整 full_course 影片與後續新增的完整課程內容",
  "一次性付款，course_full 權限不設定到期日",
  "離開 Lab、教授停止訂閱或畢業後仍保留個人課程權限",
  "課程買斷與團隊 PDF AI 稽核分開，不混用權限或費用",
];

const outcomes = [
  "Meeting 前建立清楚的研究敘事與應答架構",
  "把文獻、研究缺口、簡報與寫作拆成可執行流程",
  "建立能持續使用、不依附單一 Lab 的個人課程資源",
];

function formatTwd(amount: number) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function CoursePage() {
  const supabase = await createV2Client();
  const provider = getConfiguredDatabaseProviderName();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: entitlement }, { data: products }] = await Promise.all([
    user
      ? supabase
          .from("entitlements")
          .select("id")
          .eq("user_id", user.id)
          .eq("entitlement_type", "course_full")
          .eq("status", "active")
          .is("ends_at", null)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("products")
      .select("id,slug")
      .in("slug", ["student-course-full", "student-lab-course-upgrade"])
      .eq("is_active", true),
  ]);

  const productIds = products?.map((product) => product.id) ?? [];
  const { data: prices } =
    provider && productIds.length > 0
      ? await supabase
          .from("product_prices")
          .select("product_id,amount,currency")
          .in("product_id", productIds)
          .eq("provider", provider)
          .eq("interval", "one_time")
          .eq("is_active", true)
      : { data: null };

  const productById = new Map(
    products?.map((product) => [product.id, product.slug]) ?? [],
  );
  const standardPrice = prices?.find(
    (price) => productById.get(price.product_id) === "student-course-full",
  );
  const labPrice = prices?.find(
    (price) =>
      productById.get(price.product_id) === "student-lab-course-upgrade",
  );
  const checkoutEnabled = Boolean(provider && standardPrice?.amount != null);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.22),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] px-4 py-12 text-white">
      <section className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
            RAPID4GRAD COURSE
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            研究生畢業加速課程
            <span className="block text-cyan-300">一次買斷，永久保留</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
            完整課程屬於學生個人帳號，不依附 Professor 或 Lab。付款完成後，系統會以永久
            course_full entitlement 開通完整影片；日後離開 Lab 或畢業都不會失效。
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

        <aside className="rounded-[2rem] border border-cyan-300/20 bg-slate-950/80 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm font-medium text-cyan-200">
              學生個人完整課程買斷
            </p>
            <div className="mt-5">
              <span className="text-4xl font-semibold tracking-tight">
                {standardPrice?.amount != null
                  ? formatTwd(standardPrice.amount)
                  : "價格待公告"}
              </span>
              <span className="ml-3 text-sm text-slate-400">一次性付款</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {labPrice?.amount != null
                ? `有效訂閱 Lab 的 active student，結帳時由 Server 自動套用 ${formatTwd(labPrice.amount)} 優惠價。`
                : "Lab student 優惠價同樣待公告；資格只在建立訂單當下由 Server 驗證。"}
            </p>
          </div>

          <ul className="mt-6 space-y-3">
            {features.map((feature) => (
              <li
                key={feature}
                className="flex gap-3 text-sm leading-6 text-slate-200"
              >
                <span className="mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-xs text-cyan-200">
                  ✓
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <CourseCheckoutButton
            disabled={!checkoutEnabled}
            alreadyOwned={Boolean(entitlement)}
          />

          <p className="mt-4 text-center text-xs leading-5 text-slate-500">
            新付款流程只寫入 orders、payments 與永久 entitlement，不以 profiles.is_paid
            作為 V2 權限來源。退款與拒付由 Admin 人工審核。
          </p>
        </aside>
      </section>
    </main>
  );
}
