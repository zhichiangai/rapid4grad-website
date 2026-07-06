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

type DocumentRow = {
  id: string;
  original_filename: string;
  document_type: string;
  upload_status: string;
  file_size_bytes: number;
  created_at: string;
};

type AuditJobRow = {
  id: string;
  document_id: string;
  audit_type: string;
  provider: string;
  model: string;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type AuditResultRow = {
  job_id: string;
  summary: string;
  result_markdown: string;
  risk_level: "low" | "medium" | "high" | null;
  issue_tags: string[];
  token_input: number;
  token_output: number;
  cost_estimate_cents: number;
  created_at: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "尚無紀錄";
  }

  return new Date(value).toLocaleString("zh-TW");
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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

  return { user, admin };
}

export default async function ProfessorStudentPage({ params }: StudentPageProps) {
  const { labId, studentId } = await params;
  const { user, admin } = await requireProfessor();

  const { data: lab, error: labError } = await admin
    .from("labs")
    .select("id,name,institution,owner_professor_id")
    .eq("id", labId)
    .eq("owner_professor_id", user.id)
    .maybeSingle<LabRow>();

  if (labError) {
    throw new Error(labError.message);
  }

  if (!lab) {
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

  const { data: documentsData, error: documentsError } = await admin
    .from("student_documents")
    .select("id,original_filename,document_type,upload_status,file_size_bytes,created_at")
    .eq("lab_id", lab.id)
    .eq("user_id", student.id)
    .order("created_at", { ascending: false })
    .returns<DocumentRow[]>();

  if (documentsError) {
    throw new Error(documentsError.message);
  }

  const { data: jobsData, error: jobsError } = await admin
    .from("ai_audit_jobs")
    .select(
      "id,document_id,audit_type,provider,model,status,error_message,created_at,updated_at,completed_at",
    )
    .eq("lab_id", lab.id)
    .eq("user_id", student.id)
    .order("updated_at", { ascending: false })
    .returns<AuditJobRow[]>();

  if (jobsError) {
    throw new Error(jobsError.message);
  }

  const jobs = jobsData ?? [];
  const jobIds = jobs.map((job) => job.id);
  const { data: resultsData, error: resultsError } =
    jobIds.length > 0
      ? await admin
          .from("ai_audit_results")
          .select(
            "job_id,summary,result_markdown,risk_level,issue_tags,token_input,token_output,cost_estimate_cents,created_at",
          )
          .in("job_id", jobIds)
          .returns<AuditResultRow[]>()
      : { data: [], error: null };

  if (resultsError) {
    throw new Error(resultsError.message);
  }

  const resultsByJobId = new Map(
    (resultsData ?? []).map((result) => [result.job_id, result]),
  );
  const documentsById = new Map(
    (documentsData ?? []).map((document) => [document.id, document]),
  );

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
            <h2 className="text-lg font-semibold">文件數</h2>
            <p className="mt-4 text-4xl font-semibold text-cyan-100">
              {(documentsData ?? []).length}
            </p>
            <p className="mt-2 text-sm text-slate-400">此 Lab 內上傳的研究文件</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-lg font-semibold">AI 稽核數</h2>
            <p className="mt-4 text-4xl font-semibold text-blue-100">
              {jobs.length}
            </p>
            <p className="mt-2 text-sm text-slate-400">包含進行中與已完成稽核</p>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
          <h2 className="text-2xl font-semibold">AI Audit Timeline</h2>
          <div className="mt-5 space-y-4">
            {jobs.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-slate-400">
                尚無 AI 稽核紀錄。
              </div>
            ) : (
              jobs.map((job) => {
                const result = resultsByJobId.get(job.id);
                const document = documentsById.get(job.document_id);

                return (
                  <article
                    key={job.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 p-5"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                          {job.audit_type} · {job.provider}/{job.model}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-white">
                          {document?.original_filename ?? "未知文件"}
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {document
                            ? `${document.document_type} · ${formatFileSize(
                                document.file_size_bytes,
                              )} · ${document.upload_status}`
                            : "文件 metadata 不存在"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-slate-200">
                          {job.status}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskClass(
                            result?.risk_level,
                          )}`}
                        >
                          {result?.risk_level ?? "low"}
                        </span>
                      </div>
                    </div>

                    {result ? (
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
                        <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-6 text-slate-300">
                          {result.result_markdown}
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                          token input {result.token_input} · output{" "}
                          {result.token_output} · estimated cost{" "}
                          {result.cost_estimate_cents} cents
                        </p>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-400">
                        尚無完成結果。狀態更新：{formatDate(job.updated_at)}
                        {job.error_message ? ` · ${job.error_message}` : ""}
                      </p>
                    )}
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
