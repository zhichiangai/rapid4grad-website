import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { requireAdminContext } from "@/lib/admin/authorization";
import { resolveAdminMessage } from "@/lib/admin/messages";

type SearchParams = Promise<{ q?: string; status?: string; message?: string }>;
type ProfileRow = { id: string; email: string; full_name: string | null; role: "student" | "professor" | "admin"; account_status: "active" | "suspended"; created_at: string };
type MembershipRow = { user_id: string; lab_id: string; role: string; status: string };
type LabRow = { id: string; name: string };

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 120) ?? "";
  const status = ["active", "suspended"].includes(params.status ?? "") ? params.status : "";
  const { admin } = await requireAdminContext("/admin/users");
  const pattern = `%${query.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
  const searches = query
    ? [
        admin.from("profiles").select("id,email,full_name,role,account_status,created_at").ilike("email", pattern).limit(50).returns<ProfileRow[]>(),
        admin.from("profiles").select("id,email,full_name,role,account_status,created_at").ilike("full_name", pattern).limit(50).returns<ProfileRow[]>(),
        ...(isUuid(query) ? [admin.from("profiles").select("id,email,full_name,role,account_status,created_at").eq("id", query).limit(1).returns<ProfileRow[]>()] : []),
      ]
    : [admin.from("profiles").select("id,email,full_name,role,account_status,created_at").order("created_at", { ascending: false }).limit(50).returns<ProfileRow[]>()];
  const results = await Promise.all(searches);
  let profiles = [...new Map(results.flatMap((result) => result.data ?? []).map((profile) => [profile.id, profile])).values()];
  if (status) profiles = profiles.filter((profile) => profile.account_status === status);
  const failed = results.some((result) => Boolean(result.error));
  const userIds = profiles.map((profile) => profile.id);
  const membershipsResult = userIds.length ? await admin.from("lab_memberships").select("user_id,lab_id,role,status").in("user_id", userIds).eq("status", "active").returns<MembershipRow[]>() : { data: [], error: null };
  const labIds = [...new Set((membershipsResult.data ?? []).map((membership) => membership.lab_id))];
  const labsResult = labIds.length ? await admin.from("labs").select("id,name").in("id", labIds).returns<LabRow[]>() : { data: [], error: null };
  if (failed || membershipsResult.error || labsResult.error) console.error("[admin-users] safe lookup failed");
  const labNames = new Map((labsResult.data ?? []).map((lab) => [lab.id, lab.name]));
  const membershipsByUser = new Map<string, MembershipRow[]>();
  for (const membership of membershipsResult.data ?? []) membershipsByUser.set(membership.user_id, [...(membershipsByUser.get(membership.user_id) ?? []), membership]);
  const message = resolveAdminMessage(params.message);
  return (
    <section>
      <AdminPageHeader eyebrow="Users & Access" title="帳號" description="搜尋使用者身份與目前 workspace 狀態；高權限操作集中在使用者管理頁，避免在清單中誤觸。" />
      <form action="/admin/users" className="mb-4 flex flex-col gap-2 sm:flex-row"><input type="search" name="q" defaultValue={query} placeholder="搜尋 Email、姓名或 user ID" maxLength={120} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40" /><select name="status" defaultValue={status} aria-label="帳號狀態" className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white"><option value="">全部狀態</option><option value="active">active</option><option value="suspended">suspended</option></select><button className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300">搜尋</button></form>
      {message ? <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">{message}</p> : null}
      {failed || membershipsResult.error || labsResult.error ? <p className="mb-4 rounded-xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">目前無法完整讀取帳號資料，請稍後再試。</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.025]"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">使用者</th><th className="px-4 py-3">角色</th><th className="px-4 py-3">狀態</th><th className="px-4 py-3">Active Lab</th><th className="px-4 py-3">建立時間</th><th className="px-4 py-3 text-right">操作</th></tr></thead><tbody className="divide-y divide-white/10">{profiles.map((profile) => { const memberships = membershipsByUser.get(profile.id) ?? []; return <tr key={profile.id} className="hover:bg-white/[0.025]"><td className="px-4 py-4"><p className="font-medium text-white">{profile.full_name ?? "未填姓名"}</p><p className="mt-1 max-w-[260px] truncate text-xs text-slate-400" title={profile.email}>{profile.email}</p></td><td className="px-4 py-4"><AdminStatusBadge status={profile.role} /></td><td className="px-4 py-4"><AdminStatusBadge status={profile.account_status} /></td><td className="px-4 py-4 text-slate-300">{memberships.length ? memberships.map((membership) => <span key={`${membership.lab_id}:${membership.role}`} className="mr-2 inline-block">{labNames.get(membership.lab_id) ?? "Lab"}</span>) : <span className="text-slate-500">無</span>}</td><td className="px-4 py-4 text-xs text-slate-500">{new Date(profile.created_at).toLocaleDateString("zh-TW")}</td><td className="px-4 py-4 text-right"><Link href={`/admin/users/${profile.id}`} className="rounded-lg border border-cyan-300/20 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/10">管理</Link></td></tr>; })}{profiles.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">找不到符合條件的帳號。</td></tr> : null}</tbody></table></div>
    </section>
  );
}
