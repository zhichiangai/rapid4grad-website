import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { canAccessWorkspace } from "@/lib/workspace/access";

type StudentPageProps = {
  params: Promise<{
    labId: string;
    studentId: string;
  }>;
};

type LabRow = {
  id: string;
  name: string;
  institution: string | null;
  owner_professor_id: string;
};

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  degree: string | null;
  department: string | null;
  research_area: string | null;
  advisor_name: string | null;
  advisor_style: string | null;
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

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "尚無紀錄";
  }

  return new Date(value).toLocaleString("zh-TW");
}

function riskClass(riskLevel: string | null | undefined) {
  if (riskLevel === "high") {
    return "border-red-300/30 bg-red-400/10 text-red-100";
  }

  if (riskLevel === "medium") {
    return "border-amber-300/30 bg-amber-400/10 text-amber-100";
  }

  return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100";
}

async function requireProfessor() {
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
    .select("id,role")
    .eq("id", user.id)
    .maybeSingle<{ id: string; role: string }>();

  if (error) {
    throw new Error(error.message);
  }

  if (!canAccessWorkspace(profile?.role, "professor")) {
    redirect("/dashboard");
  }

  return { user, profile, admin, supabase };
}

export default async function ProfessorStudentPage({ params }: StudentPageProps) {
  const { labId, studentId } = await params;
  const { user, profile, admin, supabase } = await requireProfessor();

  const { data: lab, error: labError } = await admin
    .from("labs")
    .select("id,name,institution,owner_professor_id")
    .eq("id", labId)
    .maybeSingle<LabRow>();

  if (labError) {
    throw new Error(labError.message);
  }

  if (!lab) {
    redirect("/professor/dashboard");
  }

  const isOwner = lab.owner_professor_id === user.id;
  const isAdminObservation = profile?.role === "admin";
  const { data: viewerMembership, error: viewerMembershipError } =
    !isOwner && !isAdminObservation
      ? await admin
          .from("lab_memberships")
          .select("id")
          .eq("lab_id", lab.id)
          .eq("user_id", user.id)
          .eq("status", "active")
          .in("role", ["professor", "assistant"])
          .maybeSingle()
      : { data: null, error: null };

  if (viewerMembershipError || (!isOwner && !isAdminObservation && !viewerMembership)) {
    redirect("/professor/dashboard");
  }

  const { data: membership, error: membershipError } = await admin
    .from("lab_memberships")
    .select("id")
    .eq("lab_id", lab.id)
    .eq("user_id", studentId)
    .eq("role", "student")
    .eq("status", "active")
    .maybeSingle<{ id: string }>();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (!membership) {
    redirect(`/professor/labs/${lab.id}`);
  }

  const { data: student, error: studentError } = await admin
    .from("profiles")
    .select(
      "id,email,full_name,degree,department,research_area,advisor_name,advisor_style",
    )
    .eq("id", studentId)
    .maybeSingle<ProfileRow>();

  if (studentError) {
    throw new Error(studentError.message);
  }

  if (!student) {
    redirect(`/professor/labs/${lab.id}`);
  }

  const { data: summariesData, error: summariesError } = await supabase.rpc(
    "get_shared_audit_summaries",
    {
      target_lab_id: lab.id,
      target_student_user_id: student.id,
    },
  );
  if (summariesError) throw new Error(summariesError.message);
  const summaries = (summariesData ?? []) as SharedAuditSummary[];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/professor/labs/${lab.id}`}
          className="text-sm font-semibold text-cyan-200 hover:text-cyan-100"
        >
          ← 回 {lab.name}
        </Link>

        <section className="mt-5 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_35%),rgba(15,23,42,0.88)] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200">
            Student Detail
          </p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">
                {student.full_name ?? student.email}
              </h1>
              <p className="mt-2 text-slate-300">
                {student.email} · {student.degree ?? "未設定學位"} ·{" "}
                {student.research_area ?? student.department ?? "未設定研究領域"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
              Lab：{lab.name}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-lg font-semibold">指導資訊</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Advisor</dt>
                <dd className="mt-1 text-slate-200">
                  {student.advisor_name ?? "未設定"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Advisor Style</dt>
                <dd className="mt-1 text-slate-200">
                  {student.advisor_style ?? "未設定"}
                </dd>
              </div>
            </dl>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-lg font-semibold">已分享摘要來源</h2>
            <p className="mt-4 text-4xl font-semibold text-cyan-100">
              {summaries.length}
            </p>
            <p className="mt-2 text-sm text-slate-400">不包含 PDF 本文或檔案 metadata</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-lg font-semibold">AI 稽核數</h2>
            <p className="mt-4 text-4xl font-semibold text-blue-100">
              {summaries.length}
            </p>
            <p className="mt-2 text-sm text-slate-400">包含進行中與已完成稽核</p>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
          <h2 className="text-2xl font-semibold">AI Audit Timeline</h2>
          <div className="mt-5 space-y-4">
            {summaries.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-slate-400">
                尚無 AI 稽核紀錄。
              </div>
            ) : (
              summaries.map((result) => {
                return (
                  <article
                    key={result.job_id}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 p-5"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                          Shared audit summary
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-white">
                          已授權的 AI 稽核摘要
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                          PDF 本文、檔名與 Storage metadata 維持私人
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskClass(
                            result?.risk_level,
                          )}`}
                        >
                          {result?.risk_level ?? "low"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                        <p className="text-sm leading-6 text-slate-200">
                          {result.summary}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {result.issue_tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      <p className="mt-3 text-xs text-slate-500">
                        完成時間：{formatDate(result.completed_at ?? result.created_at)}
                      </p>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
