import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfessorLabControls } from "@/components/professor/ProfessorLabControls";
import { createV2AdminClient, createV2Client } from "@/lib/supabase/server";
import { canAccessWorkspace } from "@/lib/workspace/access";

type LabRow = {
  id: string;
  name: string;
  institution: string | null;
  owner_professor_id: string;
  created_at: string;
  updated_at: string;
};

type ViewerLabMembershipRow = {
  lab_id: string;
  role: "professor" | "assistant";
};

type MembershipRow = {
  lab_id: string;
  user_id: string;
  joined_at: string;
};

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  degree: string | null;
  research_area: string | null;
};

type SharedAuditSummary = {
  job_id: string;
  student_user_id: string;
  summary: string;
  risk_level: "low" | "medium" | "high" | null;
  issue_tags: string[];
  completed_at: string | null;
  created_at: string;
};

type StudentOverview = {
  labId: string;
  profile: ProfileRow;
  joinedAt: string;
  latestSummary: SharedAuditSummary | null;
};

function riskBadgeClass(riskLevel: string | null | undefined) {
  if (riskLevel === "high") {
    return "border-red-300/30 bg-red-400/10 text-red-100";
  }

  if (riskLevel === "medium") {
    return "border-amber-300/30 bg-amber-400/10 text-amber-100";
  }

  return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100";
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "尚無紀錄";
  }

  return new Date(value).toLocaleString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function getProfessorUser() {
  const supabase = await createV2Client();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/professor/dashboard");
  }

  const admin = createV2AdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id,email,full_name,role")
    .eq("id", user.id)
    .maybeSingle<{
      id: string;
      email: string;
      full_name: string | null;
      role: string;
    }>();

  if (error) {
    throw new Error(error.message);
  }

  if (!profile || !canAccessWorkspace(profile.role, "professor")) {
    redirect("/dashboard");
  }

  return { user, profile, admin, supabase };
}

export default async function ProfessorDashboardPage() {
  const { user, profile, admin, supabase } = await getProfessorUser();

  const { data: currentSubscription, error: subscriptionError } = await admin
    .from("subscriptions")
    .select(
      "id,lab_id,plan_key,status,current_period_end,grace_ends_at,cancel_at_period_end",
    )
    .eq("payer_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionError) {
    console.error("Professor subscription lookup failed", {
      code: subscriptionError.code,
    });
  }

  const now = Date.now();
  const subscriptionFunctional = Boolean(
    currentSubscription &&
      (((currentSubscription.status === "active" ||
        currentSubscription.status === "trialing") &&
        new Date(currentSubscription.current_period_end).getTime() > now) ||
        (currentSubscription.status === "past_due" &&
          currentSubscription.grace_ends_at &&
          new Date(currentSubscription.grace_ends_at).getTime() > now)),
  );
  const subscriptionMode: "functional" | "read_only" | "none" =
    subscriptionFunctional
      ? "functional"
      : currentSubscription
        ? "read_only"
        : "none";

  const { data: ownedLabsData, error: ownedLabsError } = await admin
    .from("labs")
    .select("id,name,institution,owner_professor_id,created_at,updated_at")
    .eq("owner_professor_id", user.id)
    .order("created_at", { ascending: false })
    .returns<LabRow[]>();

  if (ownedLabsError) {
    throw new Error(ownedLabsError.message);
  }

  const { data: viewerMembershipsData, error: viewerMembershipsError } =
    profile.role === "professor"
      ? await admin
          .from("lab_memberships")
          .select("lab_id,role")
          .eq("user_id", user.id)
          .eq("status", "active")
          .in("role", ["professor", "assistant"])
          .returns<ViewerLabMembershipRow[]>()
      : { data: [], error: null };
  if (viewerMembershipsError) {
    throw new Error(viewerMembershipsError.message);
  }

  const visibleLabIds = [
    ...new Set([
      ...(ownedLabsData ?? []).map((lab) => lab.id),
      ...(viewerMembershipsData ?? []).map((membership) => membership.lab_id),
    ]),
  ];
  const { data: labsData, error: labsError } =
    visibleLabIds.length > 0
      ? await admin
          .from("labs")
          .select("id,name,institution,owner_professor_id,created_at,updated_at")
          .in("id", visibleLabIds)
          .order("created_at", { ascending: false })
          .returns<LabRow[]>()
      : { data: [], error: null };
  if (labsError) throw new Error(labsError.message);

  const labs = labsData ?? [];
  const ownedLabs = labs.filter((lab) => lab.owner_professor_id === user.id);
  const labIds = labs.map((lab) => lab.id);
  const { data: membershipsData, error: membershipsError } =
    labIds.length > 0
      ? await admin
          .from("lab_memberships")
          .select("lab_id,user_id,joined_at")
          .in("lab_id", labIds)
          .eq("role", "student")
          .eq("status", "active")
          .returns<MembershipRow[]>()
      : { data: [], error: null };

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const memberships = membershipsData ?? [];
  const studentIds = [...new Set(memberships.map((membership) => membership.user_id))];
  const { data: profilesData, error: profilesError } =
    studentIds.length > 0
      ? await admin
          .from("profiles")
          .select("id,email,full_name,degree,research_area")
          .in("id", studentIds)
          .returns<ProfileRow[]>()
      : { data: [], error: null };

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const summaryResponses = await Promise.all(
    labIds.map((labId) =>
      supabase.rpc("get_shared_audit_summaries", {
        target_lab_id: labId,
      }),
    ),
  );
  const summaryError = summaryResponses.find((response) => response.error)?.error;
  if (summaryError) throw new Error(summaryError.message);

  const profilesById = new Map(
    (profilesData ?? []).map((studentProfile) => [studentProfile.id, studentProfile]),
  );
  const latestSummaryByLabStudent = new Map<string, SharedAuditSummary>();
  summaryResponses.forEach((response, index) => {
    const labId = labIds[index];
    for (const summary of (response.data ?? []) as SharedAuditSummary[]) {
      const key = `${labId}:${summary.student_user_id}`;
      if (!latestSummaryByLabStudent.has(key)) {
        latestSummaryByLabStudent.set(key, summary);
      }
    }
  });

  const studentsByLabId = new Map<string, StudentOverview[]>();

  for (const membership of memberships) {
    const studentProfile = profilesById.get(membership.user_id);

    if (!studentProfile) {
      continue;
    }

    const latestSummary = latestSummaryByLabStudent.get(
      `${membership.lab_id}:${membership.user_id}`,
    );
    const overview: StudentOverview = {
      labId: membership.lab_id,
      profile: studentProfile,
      joinedAt: membership.joined_at,
      latestSummary: latestSummary ?? null,
    };
    const current = studentsByLabId.get(membership.lab_id) ?? [];
    current.push(overview);
    studentsByLabId.set(membership.lab_id, current);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_36%),rgba(15,23,42,0.86)] p-6 shadow-2xl shadow-blue-950/30">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200">
            Professor Workspace
          </p>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">
                真實教授端 Lab Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                這是正式的多租戶教授端入口，和 Phase 1 隱藏展示頁
                /professor 分開。你只能看到自己擁有或以 Professor/assistant
                身分加入的 Lab，以及學生主動分享的安全摘要。
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/learn"
                className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-center text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
              >
                觀看 Lab 課程
              </Link>
              <Link
                href="/billing"
                className="rounded-2xl border border-blue-300/20 bg-blue-400/10 px-4 py-3 text-center text-sm font-semibold text-blue-100 transition hover:bg-blue-400/15"
              >
                管理訂閱
              </Link>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
                登入教授：{profile.full_name ?? profile.email}
              </div>
            </div>
          </div>
        </div>

        <div className={`mt-6 rounded-3xl border p-5 ${subscriptionMode === "functional" ? "border-emerald-300/20 bg-emerald-400/10" : "border-amber-300/20 bg-amber-400/10"}`}>
          <p className="text-sm font-semibold text-white">
            {ownedLabs.length === 0 && labs.length > 0
              ? "你目前以 Professor/assistant 成員身分加入 Lab"
              : subscriptionMode === "functional"
              ? `${currentSubscription?.plan_key === "professor_lab_plus" ? "Plus" : "Standard"} · ${currentSubscription?.status === "trialing" ? "30 天試用中" : currentSubscription?.status === "past_due" ? "15 天付款寬限中" : "訂閱使用中"}`
              : subscriptionMode === "none"
                ? "尚未啟用 Professor Lab 試用或訂閱"
                : "訂閱目前為唯讀狀態"}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {ownedLabs.length === 0 && labs.length > 0
              ? "你可以查看同 Lab 成員與 consent summary，但不能建立邀請碼、移除成員或管理訂閱。"
              : subscriptionMode === "functional"
              ? "可管理 Lab、建立邀請碼並使用 Lab 指定影片。"
              : "既有 Lab 與歷史安全摘要仍可查看；新增成員、Lab 影片與新 PDF 稽核會停用。"}
          </p>
          {ownedLabs.length > 0 && subscriptionMode !== "functional" ? (
            <Link href="/pricing" className="mt-3 inline-flex text-sm font-semibold text-cyan-100 hover:text-white">
              查看 Standard／Plus 與 30 天免綁卡試用 →
            </Link>
          ) : null}
        </div>

        {profile.role === "professor" ? (
          <div className="mt-6">
            <ProfessorLabControls
              labs={ownedLabs.map((lab) => ({
                id: lab.id,
                name: lab.name,
                institution: lab.institution,
              }))}
              subscriptionMode={subscriptionMode}
            />
          </div>
        ) : null}

        <section className="mt-8 space-y-5">
          {labs.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-slate-300">
              目前尚未建立 Lab。請先建立第一個正式 Lab，再產生學生邀請碼。
            </div>
          ) : (
            labs.map((lab) => {
              const students = studentsByLabId.get(lab.id) ?? [];

              return (
                <article
                  key={lab.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.035] p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-white">
                        {lab.name}
                      </h2>
                      <p className="mt-1 text-sm text-slate-400">
                        {lab.institution ?? "未設定單位"} · 學生 {students.length} 位 ·{" "}
                        {lab.owner_professor_id === user.id ? "Owner" : "Member"}
                      </p>
                    </div>
                    <Link
                      href={`/professor/labs/${lab.id}`}
                      className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
                    >
                      查看 Lab 詳情
                    </Link>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
                    <table className="w-full min-w-[860px] text-left text-sm">
                      <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.2em] text-slate-400">
                        <tr>
                          <th className="px-4 py-3">學生</th>
                          <th className="px-4 py-3">學位 / 領域</th>
                          <th className="px-4 py-3">最近摘要</th>
                          <th className="px-4 py-3">風險</th>
                          <th className="px-4 py-3">卡點</th>
                          <th className="px-4 py-3">更新</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {students.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-slate-400">
                              尚無學生加入。請產生邀請碼給學生。
                            </td>
                          </tr>
                        ) : (
                          students.map((student) => (
                            <tr key={`${student.labId}:${student.profile.id}`}>
                              <td className="px-4 py-4">
                                <Link
                                  href={`/professor/labs/${lab.id}/students/${student.profile.id}`}
                                  className="font-semibold text-cyan-100 hover:text-cyan-200"
                                >
                                  {student.profile.full_name ??
                                    student.profile.email}
                                </Link>
                                <p className="mt-1 text-xs text-slate-500">
                                  {student.profile.email}
                                </p>
                              </td>
                              <td className="px-4 py-4 text-slate-300">
                                {student.profile.degree ?? "未設定"}
                                <p className="mt-1 text-xs text-slate-500">
                                  {student.profile.research_area ?? "未設定研究領域"}
                                </p>
                              </td>
                              <td className="max-w-xs px-4 py-4 text-slate-300">
                                {student.latestSummary?.summary ?? "尚無 AI 稽核摘要"}
                              </td>
                              <td className="px-4 py-4">
                                <span
                                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskBadgeClass(
                                    student.latestSummary?.risk_level,
                                  )}`}
                                >
                                  {student.latestSummary?.risk_level ?? "low"}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-wrap gap-1">
                                  {(student.latestSummary?.issue_tags ?? [
                                    "no_audit_yet",
                                  ]).map((tag) => (
                                    <span
                                      key={tag}
                                      className="rounded-full bg-white/[0.06] px-2 py-1 text-xs text-slate-300"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-slate-400">
                                {formatDate(
                                  student.latestSummary?.completed_at ??
                                    student.latestSummary?.created_at ??
                                    student.joinedAt,
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
