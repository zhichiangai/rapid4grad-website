import { AdminConfirmAction } from "@/components/admin/AdminConfirmAction";
import { requireAdminContext } from "@/lib/admin/authorization";
import { resolveAdminMessage } from "@/lib/admin/messages";
import {
  grantCourseEntitlement,
  revokeCourseEntitlement,
} from "../actions";

type SearchParams = Promise<{ q?: string; message?: string }>;

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  account_status: "active" | "suspended";
};

type ProductRow = { id: string; slug: string; name: string; is_active: boolean };

type EntitlementRow = {
  id: string;
  user_id: string;
  product_id: string;
  entitlement_type: "course_full" | "legacy_tool_access";
  status: "active" | "revoked";
  starts_at: string;
  revoked_at: string | null;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export default async function AdminEntitlementsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 120) ?? "";
  const { admin } = await requireAdminContext("/admin/entitlements");
  let profiles: ProfileRow[] = [];
  let loadFailed = false;

  if (query) {
    const pattern = `%${query.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    const searches = [
      admin
        .from("profiles")
        .select("id,email,full_name,account_status")
        .ilike("email", pattern)
        .limit(30)
        .returns<ProfileRow[]>(),
      admin
        .from("profiles")
        .select("id,email,full_name,account_status")
        .ilike("full_name", pattern)
        .limit(30)
        .returns<ProfileRow[]>(),
    ];
    if (isUuid(query)) {
      searches.push(
        admin
          .from("profiles")
          .select("id,email,full_name,account_status")
          .eq("id", query)
          .limit(1)
          .returns<ProfileRow[]>(),
      );
    }
    const results = await Promise.all(searches);
    loadFailed = results.some((result) => Boolean(result.error));
    profiles = [
      ...new Map(
        results
          .flatMap((result) => result.data ?? [])
          .map((profile) => [profile.id, profile]),
      ).values(),
    ];
  }

  const [{ data: productsData, error: productsError }, entitlementResult] =
    await Promise.all([
      admin
        .from("products")
        .select("id,slug,name,is_active")
        .eq("product_type", "course")
        .contains("metadata", { entitlement_type: "course_full" })
        .order("name")
        .returns<ProductRow[]>(),
      profiles.length
        ? admin
            .from("entitlements")
            .select(
              "id,user_id,product_id,entitlement_type,status,starts_at,revoked_at",
            )
            .in(
              "user_id",
              profiles.map((profile) => profile.id),
            )
            .eq("entitlement_type", "course_full")
            .order("created_at", { ascending: false })
            .returns<EntitlementRow[]>()
        : Promise.resolve({ data: [] as EntitlementRow[], error: null }),
    ]);

  if (productsError || entitlementResult.error || loadFailed) {
    console.error("[admin-entitlements] Safe entitlement lookup failed");
    loadFailed = true;
  }

  const products = productsData ?? [];
  const entitlements = entitlementResult.data ?? [];
  const productNames = new Map(products.map((product) => [product.id, product.name]));
  const byUser = new Map<string, EntitlementRow[]>();
  for (const entitlement of entitlements) {
    byUser.set(entitlement.user_id, [
      ...(byUser.get(entitlement.user_id) ?? []),
      entitlement,
    ]);
  }

  return (
    <section>
      <header className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
          Course Entitlements
        </p>
        <h2 className="mt-2 text-2xl font-semibold">學生完整課程權限</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          只管理永久 `course_full` 權限。每次授予或撤銷都需要原因、二次確認與 Action Log。
        </p>
        <form action="/admin/entitlements" className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            name="q"
            defaultValue={query}
            maxLength={120}
            placeholder="輸入 Email、姓名或 user ID"
            className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600"
          />
          <button className="rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white">
            搜尋
          </button>
        </form>
        {resolveAdminMessage(params.message) ? (
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
            {resolveAdminMessage(params.message)}
          </p>
        ) : null}
        {loadFailed ? (
          <p className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            目前無法讀取課程權限，請稍後再試。
          </p>
        ) : null}
      </header>

      {!query ? (
        <p className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center text-slate-400">
          請先搜尋使用者，再檢視或修正課程權限。
        </p>
      ) : profiles.length === 0 ? (
        <p className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center text-slate-400">
          找不到符合條件的使用者。
        </p>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {profiles.map((profile) => {
            const userEntitlements = byUser.get(profile.id) ?? [];
            const active = userEntitlements.find(
              (entitlement) => entitlement.status === "active",
            );
            return (
              <article key={profile.id} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
                <h3 className="text-lg font-semibold text-white">
                  {profile.full_name ?? "未填姓名"}
                </h3>
                <p className="mt-1 break-all font-mono text-xs text-cyan-100">
                  {profile.email}
                </p>
                <p className="mt-4 text-sm text-slate-300">
                  目前狀態：{active ? "完整課程已啟用" : "尚無完整課程權限"}
                </p>

                {active ? (
                  <form action={revokeCourseEntitlement} className="mt-4 rounded-2xl border border-red-300/15 bg-red-400/5 p-4">
                    <input type="hidden" name="entitlementId" value={active.id} />
                    <p className="text-sm text-slate-300">
                      {productNames.get(active.product_id) ?? "完整課程"} · 啟用於 {new Date(active.starts_at).toLocaleString("zh-TW")}
                    </p>
                    <div className="mt-3">
                      <AdminConfirmAction
                        confirmationToken="CONFIRM_ENTITLEMENT_REVOKE"
                        buttonLabel="撤銷完整課程權限"
                        dialogTitle="確認撤銷永久課程權限？"
                        dialogDescription="撤銷會立即停止完整課程存取，但不會刪除帳號、訂單或付款紀錄。"
                        reasonPlaceholder="例如：退款已由人工流程核准"
                        tone="danger"
                      />
                    </div>
                  </form>
                ) : (
                  <form action={grantCourseEntitlement} className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <input type="hidden" name="userId" value={profile.id} />
                    <label className="block text-xs font-medium text-slate-300">
                      課程商品
                      <select name="productId" required className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
                        <option value="">請選擇</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}{product.is_active ? "" : "（inactive）"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="mt-3">
                      <AdminConfirmAction
                        confirmationToken="CONFIRM_ENTITLEMENT_GRANT"
                        buttonLabel="授予完整課程權限"
                        dialogTitle="確認授予永久課程權限？"
                        dialogDescription="此權限沒有到期日，請確認訂單或人工補償依據。"
                        reasonPlaceholder="例如：已核對買斷訂單"
                      />
                    </div>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
