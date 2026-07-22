import { AdminConfirmAction } from "@/components/admin/AdminConfirmAction";
import { requireAdminContext } from "@/lib/admin/authorization";
import { resolveAdminMessage } from "@/lib/admin/messages";
import {
  updateUserAccountStatus,
  updateUserRole,
} from "../actions";

type SearchParams = Promise<{ q?: string; message?: string }>;

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: "student" | "professor" | "admin";
  account_status: "active" | "suspended";
  created_at: string;
};

type MembershipRow = {
  user_id: string;
  lab_id: string;
  role: "student" | "professor" | "assistant";
  status: "active" | "pending" | "removed";
};

type LabRow = { id: string; name: string };

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 120) ?? "";
  const { admin } = await requireAdminContext("/admin/users");
  let profiles: ProfileRow[] = [];
  let loadFailed = false;

  if (query) {
    const searchPattern = `%${query.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    const searches = [
      admin
        .from("profiles")
        .select("id,email,full_name,role,account_status,created_at")
        .ilike("email", searchPattern)
        .limit(50)
        .returns<ProfileRow[]>(),
      admin
        .from("profiles")
        .select("id,email,full_name,role,account_status,created_at")
        .ilike("full_name", searchPattern)
        .limit(50)
        .returns<ProfileRow[]>(),
    ];

    if (isUuid(query)) {
      searches.push(
        admin
          .from("profiles")
          .select("id,email,full_name,role,account_status,created_at")
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
  } else {
    const { data, error } = await admin
      .from("profiles")
      .select("id,email,full_name,role,account_status,created_at")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<ProfileRow[]>();
    loadFailed = Boolean(error);
    profiles = data ?? [];
  }

  if (loadFailed) {
    console.error("[admin-users] Profile search failed");
  }

  const userIds = profiles.map((profile) => profile.id);
  const { data: membershipsData, error: membershipsError } =
    userIds.length > 0
      ? await admin
          .from("lab_memberships")
          .select("user_id,lab_id,role,status")
          .in("user_id", userIds)
          .eq("status", "active")
          .returns<MembershipRow[]>()
      : { data: [], error: null };
  const memberships = membershipsData ?? [];
  const labIds = [...new Set(memberships.map((membership) => membership.lab_id))];
  const { data: labsData, error: labsError } =
    labIds.length > 0
      ? await admin
          .from("labs")
          .select("id,name")
          .in("id", labIds)
          .returns<LabRow[]>()
      : { data: [], error: null };

  if (membershipsError || labsError) {
    console.error("[admin-users] Lab membership summary failed");
  }

  const labNames = new Map((labsData ?? []).map((lab) => [lab.id, lab.name]));
  const membershipsByUser = new Map<string, MembershipRow[]>();
  for (const membership of memberships) {
    membershipsByUser.set(membership.user_id, [
      ...(membershipsByUser.get(membership.user_id) ?? []),
      membership,
    ]);
  }

  const message = resolveAdminMessage(params.message);

  return (
    <section>
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
          Identity Operations
        </p>
        <h2 className="mt-2 text-2xl font-semibold">帳號、角色與狀態</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          只能修正 student／professor。Admin 角色與 Admin 帳號狀態不允許由此介面變更。
        </p>
        <form action="/admin/users" className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Email、姓名或 user ID"
            maxLength={120}
            className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
          />
          <button className="rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-400">
            搜尋
          </button>
        </form>
        {message ? (
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
            {message}
          </p>
        ) : null}
        {loadFailed ? (
          <p className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            目前無法讀取帳號資料，請稍後再試。
          </p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {profiles.map((profile) => {
          const profileMemberships = membershipsByUser.get(profile.id) ?? [];
          const isProtectedAdmin = profile.role === "admin";

          return (
            <article
              key={profile.id}
              className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {profile.full_name ?? "未填姓名"}
                  </h3>
                  <p className="mt-1 break-all font-mono text-xs text-cyan-100">
                    {profile.email}
                  </p>
                  <p className="mt-1 break-all font-mono text-[11px] text-slate-600">
                    {profile.id}
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1 text-xs text-blue-100">
                    {profile.role}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
                    {profile.account_status}
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Active Lab
                </p>
                {profileMemberships.length ? (
                  <div className="mt-2 space-y-1 text-sm text-slate-300">
                    {profileMemberships.map((membership) => (
                      <p key={`${membership.lab_id}:${membership.role}`}>
                        {labNames.get(membership.lab_id) ?? membership.lab_id} · {membership.role}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">無 active Lab membership</p>
                )}
              </div>

              {isProtectedAdmin ? (
                <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                  Admin 帳號受保護，角色與狀態必須由資料庫擁有者流程處理。
                </p>
              ) : (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <form action={updateUserRole} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <input type="hidden" name="userId" value={profile.id} />
                    <label className="block text-xs font-medium text-slate-300">
                      修正 workspace role
                      <select
                        name="role"
                        defaultValue={profile.role}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
                      >
                        <option value="student">student</option>
                        <option value="professor">professor</option>
                      </select>
                    </label>
                    <div className="mt-3">
                      <AdminConfirmAction
                        confirmationToken="CONFIRM_ROLE_CHANGE"
                        buttonLabel="修正角色"
                        dialogTitle="確認修正使用者角色？"
                        dialogDescription="這會改變使用者預設 workspace，但不會建立 Lab、訂閱或課程權限。"
                        reasonPlaceholder="例如：教授資格審核完成"
                      />
                    </div>
                  </form>

                  <form action={updateUserAccountStatus} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <input type="hidden" name="userId" value={profile.id} />
                    <label className="block text-xs font-medium text-slate-300">
                      帳號狀態
                      <select
                        name="accountStatus"
                        defaultValue={profile.account_status}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
                      >
                        <option value="active">active</option>
                        <option value="suspended">suspended</option>
                      </select>
                    </label>
                    <div className="mt-3">
                      <AdminConfirmAction
                        confirmationToken="CONFIRM_ACCOUNT_STATUS"
                        buttonLabel={profile.account_status === "active" ? "停用／更新" : "恢復／更新"}
                        dialogTitle="確認變更帳號狀態？"
                        dialogDescription="停用會阻止需要 active profile 的高權限功能，但不刪除帳號或歷史資料。"
                        reasonPlaceholder="例如：客服完成身分核對"
                        tone={profile.account_status === "active" ? "danger" : "default"}
                      />
                    </div>
                  </form>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {!loadFailed && profiles.length === 0 ? (
        <div className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.035] p-10 text-center text-slate-400">
          找不到符合條件的帳號。
        </div>
      ) : null}
    </section>
  );
}
