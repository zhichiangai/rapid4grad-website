import { unlockQuota } from "../actions";
import { AdminConfirmAction } from "@/components/admin/AdminConfirmAction";
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
          "找不到這個 Email 的免費額度紀錄，可直接按下方按鈕建立並解鎖。";
      }
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-2xl shadow-blue-950/20">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
        Free Usage Quotas
      </p>
      <h2 className="mt-2 text-2xl font-semibold">免費額度管理</h2>

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

      <form action={unlockQuota} className="mt-3">
        <input type="hidden" name="email" value={normalizedEmail} />
        {normalizedEmail ? (
          <AdminConfirmAction
            confirmationToken="CONFIRM_QUOTA_UNLOCK"
            buttonLabel="解鎖並增加次數"
            dialogTitle="確認解鎖 Legacy 免費額度？"
            dialogDescription="此操作只影響 Phase 1 免費額度相容層，並會留下管理操作紀錄。"
            reasonPlaceholder="例如：客服補償一次免費使用"
          />
        ) : (
          <p className="text-sm text-slate-500">請先輸入 Email。</p>
        )}
      </form>

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
