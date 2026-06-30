import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfessorLabControls } from "@/components/professor/ProfessorLabControls";
import { createAdminClient, createClient } from "@/lib/supabase/server";

type LabRow = {
  id: string;
  name: string;
  institution: string | null;
  created_at: string;
  updated_at: string;
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

type AuditJobRow = {
  id: string;
  lab_id: string | null;
  user_id: string;
  status: string;
  updated_at: string;
  completed_at: string | null;
};

type AuditResultRow = {
  job_id: string;
  summary: string;
  risk_level: "low" | "medium" | "high" | null;
  issue_tags: string[];
  created_at: string;
};

type StudentOverview = {
  labId: string;
  profile: ProfileRow;
  joinedAt: string;
  latestJob: AuditJobRow | null;
  latestResult: AuditResultRow | null;
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/professor/dashboard");
  }

  const admin = createAdminClient();
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

  if (profile?.role !== "professor") {
    redirect("/dashboard");
  }

  return { user, profile, admin };
}

export default async function ProfessorDashboardPage() {
  const { user, profile, admin } = await getProfessorUser();

  const { data: labsData, error: labsError } = await admin
    .from("labs")
    .select("id,name,institution,created_at,updated_at")
    .eq("owner_professor_id", user.id)
    .order("created_at", { ascending: false })
    .returns<LabRow[]>();

  if (labsError) {
    throw new Error(labsError.message);
  }

  const labs = labsData ?? [];
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

  const { data: jobsData, error: jobsError } =
    studentIds.length > 0 && labIds.length > 0
      ? await admin
          .from("ai_audit_jobs")
          .select("id,lab_id,user_id,status,updated_at,completed_at")
          .in("lab_id", labIds)
          .in("user_id", studentIds)
          .order("updated_at", { ascending: false })
          .returns<AuditJobRow[]>()
      : { data: [], error: null };

  if (jobsError) {
    throw new Error(jobsError.message);
  }

  const jobs = jobsData ?? [];
  const jobIds = jobs.map((job) => job.id);
  const { data: resultsData, error: resultsError } =
    jobIds.length > 0
      ? await admin
          .from("ai_audit_results")
          .select("job_id,summary,risk_level,issue_tags,created_at")
          .in("job_id", jobIds)
          .returns<AuditResultRow[]>()
      : { data: [], error: null };

  if (resultsError) {
    throw new Error(resultsError.message);
  }

  const profilesById = new Map(
    (profilesData ?? []).map((studentProfile) => [studentProfile.id, studentProfile]),
  );
  const resultsByJobId = new Map(
    (resultsData ?? []).map((result) => [result.job_id, result]),
  );
  const latestJobByLabStudent = new Map<string, AuditJobRow>();

  for (const job of jobs) {
    if (!job.lab_id) {
      continue;
    }

    const key = `${job.lab_id}:${job.user_id}`;

    if (!latestJobByLabStudent.has(key)) {
      latestJobByLabStudent.set(key, job);
    }
  }

  const studentsByLabId = new Map<string, StudentOverview[]>();

  for (const membership of memberships) {
    const studentProfile = profilesById.get(membership.user_id);

    if (!studentProfile) {
      continue;
    }

    const latestJob = latestJobByLabStudent.get(
      `${membership.lab_id}:${membership.user_id}`,
    );
    const overview: StudentOverview = {
      labId: membership.lab_id,
      profile: studentProfile,
      joinedAt: membership.joined_at,
      latestJob: latestJob ?? null,
      latestResult: latestJob ? (resultsByJobId.get(latestJob.id) ?? null) : null,
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
                /professor 分開。教授只能看到自己擁有的 Lab 與透過邀請碼加入的學生。
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
              登入教授：{profile.full_name ?? profile.email}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <ProfessorLabControls
            labs={labs.map((lab) => ({
              id: lab.id,
              name: lab.name,
              institution: lab.institution,
            }))}
          />
        </div>

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
                        {lab.institution ?? "未設定單位"} · 學生 {students.length} 位
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
                                {student.latestResult?.summary ?? "尚無 AI 稽核摘要"}
                              </td>
                              <td className="px-4 py-4">
                                <span
                                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskBadgeClass(
                                    student.latestResult?.risk_level,
                                  )}`}
                                >
                                  {student.latestResult?.risk_level ?? "low"}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-wrap gap-1">
                                  {(student.latestResult?.issue_tags ?? [
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
                                  student.latestJob?.completed_at ??
                                    student.latestJob?.updated_at ??
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
