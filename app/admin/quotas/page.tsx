import { requireAdminContext } from "@/lib/admin/authorization";
import { resolveAdminMessage } from "@/lib/admin/messages";

type AdminQuotasSearchParams = Promise<{
  email?: string;
  message?: string;
}>;

type QuotaRow = {
  id: string;
  email: string;
  daily_count: number;
  total_count: number;
  daily_limit: number;
  total_limit: number;
  unlocked_by_admin: boolean;
  admin_unlocked_total: number;
  last_used_at: string | null;
};

export default async function AdminQuotasPage({
  searchParams,
}: {
  searchParams: AdminQuotasSearchParams;
}) {
  const params = await searchParams;
  const normalizedEmail = params.email?.trim().toLowerCase() ?? "";
  const { admin: supabase } = await requireAdminContext("/admin/quotas");
  let quota: QuotaRow | null = null;
  let message = resolveAdminMessage(params.message);

  if (normalizedEmail) {
    const { data, error } = await supabase
      .from("free_usage_quotas")
      .select(
        "id,email,daily_count,total_count,daily_limit,total_limit,unlocked_by_admin,admin_unlocked_total,last_used_at",
      )
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error("[admin-quotas] Quota lookup failed", { code: error.code });
      message = "目前無法讀取額度資料，請稍後再試。";
    } else {
      quota = data as QuotaRow | null;
      if (!quota && !message) {
        message =
          "找不到這個 Email 的舊版額度紀錄。V2 AI 指令產生器不再建立或使用此資料。";
      }
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-2xl shadow-blue-950/20">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
        Legacy Usage Archive
      </p>
      <h2 className="mt-2 text-2xl font-semibold">舊版免費額度紀錄</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        V2 AI 指令產生器改為匿名 20 次、Email 驗證或 Google 登入後不限次使用；此頁只保留 Phase 1 相容資料。
      </p>

      <form
        action="/admin/quotas"
        className="mt-6 flex flex-col gap-3 sm:flex-row"
      >
        <input
          type="email"
          name="email"
          defaultValue={normalizedEmail}
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-300/50"
          placeholder="輸入使用者 Email"
        />
        <button
          type="submit"
          className="rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400"
        >
          搜尋
        </button>
      </form>

      <p className="mt-3 rounded-2xl border border-amber-300/15 bg-amber-400/[0.06] px-4 py-3 text-sm leading-6 text-amber-50">
        此頁已改為唯讀歷史檔案。V2 AI 指令產生器不再依賴或修改這些額度資料。
      </p>

      {message ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
          {message}
        </p>
      ) : null}

      {quota ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            ["Email", quota.email],
            ["Daily", `${quota.daily_count} / ${quota.daily_limit}`],
            ["Total", `${quota.total_count} / ${quota.total_limit}`],
            [
              "Admin Unlock",
              quota.unlocked_by_admin
                ? `true (+${quota.admin_unlocked_total})`
                : "false",
            ],
            [
              "Last Used",
              quota.last_used_at
                ? new Date(quota.last_used_at).toLocaleString("zh-TW")
                : "-",
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {label}
              </p>
              <p className="mt-2 break-words text-sm text-slate-200">{value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
