import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type HistoryPageProps = {
  searchParams: Promise<{
    job?: string;
  }>;
};

type AuditHistoryRow = {
  id: string;
  audit_type: string;
  model: string;
  status: string;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  student_documents: {
    original_filename: string;
    document_type: string;
  } | null;
  ai_audit_results:
    | {
        summary: string;
        result_markdown: string;
        risk_level: "low" | "medium" | "high" | null;
      }[]
    | null;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "尚未完成";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatAuditType(value: string) {
  const map: Record<string, string> = {
    advisor_questions: "教授提問清單",
    logic_check: "邏輯檢查",
    presentation_review: "簡報審查",
    english_polish: "英文潤稿",
    full_review: "完整稽核",
  };

  return map[value] ?? value;
}

function formatDocumentType(value: string) {
  const map: Record<string, string> = {
    thesis: "論文",
    slides: "簡報",
    draft: "草稿",
    paper: "期刊稿",
  };

  return map[value] ?? value;
}

function formatStatus(value: string) {
  const map: Record<string, string> = {
    completed: "完成",
    failed: "失敗",
    queued: "排隊中",
    streaming: "生成中",
    cancelled: "已取消",
  };

  return map[value] ?? value;
}

function riskBadgeClass(riskLevel: "low" | "medium" | "high" | null | undefined) {
  if (riskLevel === "high") {
    return "border-red-300/30 bg-red-400/15 text-red-100";
  }

  if (riskLevel === "medium") {
    return "border-amber-300/30 bg-amber-400/15 text-amber-100";
  }

  if (riskLevel === "low") {
    return "border-emerald-300/30 bg-emerald-400/15 text-emerald-100";
  }

  return "border-white/10 bg-white/5 text-slate-300";
}

function statusBadgeClass(status: string) {
  if (status === "completed") {
    return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100";
  }

  if (status === "failed") {
    return "border-red-300/30 bg-red-400/10 text-red-100";
  }

  return "border-cyan-300/20 bg-cyan-400/10 text-cyan-100";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatInlineMarkdown(text: string) {
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function renderMarkdownToHtml(markdown: string) {
  const lines = escapeHtml(markdown).split(/\r?\n/);
  const blocks: string[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }

    blocks.push(
      `<ul>${listItems
        .map((item) => `<li>${formatInlineMarkdown(item)}</li>`)
        .join("")}</ul>`,
    );
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      flushList();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const content = formatInlineMarkdown(headingMatch[2]);
      blocks.push(`<h${level}>${content}</h${level}>`);
      continue;
    }

    const listMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (listMatch) {
      listItems.push(listMatch[1]);
      continue;
    }

    flushList();
    blocks.push(`<p>${formatInlineMarkdown(trimmed)}</p>`);
  }

  flushList();
  return blocks.join("");
}

export default async function AiAuditHistoryPage({
  searchParams,
}: HistoryPageProps) {
  await cookies();
  const [{ job: selectedJobId }, supabase] = await Promise.all([
    searchParams,
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/ai-audit/history");
  }

  const { data, error } = await supabase
    .from("ai_audit_jobs")
    .select(
      "id,audit_type,model,status,error_message,created_at,completed_at,student_documents(original_filename,document_type),ai_audit_results(summary,result_markdown,risk_level)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<AuditHistoryRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const jobs = data ?? [];
  const selectedJob =
    jobs.find((job) => job.id === selectedJobId) ?? jobs[0] ?? null;
  const selectedResult = selectedJob?.ai_audit_results?.[0] ?? null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_32rem),linear-gradient(180deg,#020617_0%,#0f172a_55%,#020617_100%)] px-4 py-10 text-white">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-7 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
                AI AUDIT HISTORY
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">
                PDF 稽核歷史紀錄
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
                最近 20 筆稽核紀錄會依時間排序。你可以快速掃描文件、模式、模型與風險等級，再打開單筆結果閱讀完整教授提問清單。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/ai-audit"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-400/10"
              >
                回 PDF AI 稽核
              </Link>
            </div>
          </div>
        </header>

        {jobs.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-white/15 bg-white/[0.03] px-8 py-20 text-center">
            <div className="mx-auto max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Empty State
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                還沒有任何 AI 稽核歷史
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-400">
                先到 PDF AI 稽核頁面上傳你的論文或簡報 PDF，完成一次稽核後，這裡就會出現可回看的紀錄與完整結果。
              </p>
              <Link
                href="/dashboard/ai-audit"
                className="mt-8 inline-flex rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
              >
                前往建立第一筆稽核
              </Link>
            </div>
          </section>
        ) : (
          <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/75 shadow-xl shadow-slate-950/30">
              <div className="border-b border-white/10 px-6 py-5">
                <h2 className="text-xl font-semibold">最近 20 筆任務</h2>
                <p className="mt-2 text-sm text-slate-400">
                  點擊任一列即可打開單筆稽核內容。
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-white/[0.03] text-slate-400">
                    <tr>
                      <th className="px-4 py-4 font-medium">原始檔名</th>
                      <th className="px-4 py-4 font-medium">文件類型</th>
                      <th className="px-4 py-4 font-medium">稽核模式</th>
                      <th className="px-4 py-4 font-medium">模型</th>
                      <th className="px-4 py-4 font-medium">風險</th>
                      <th className="px-4 py-4 font-medium">狀態</th>
                      <th className="px-4 py-4 font-medium">稽核時間</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => {
                      const result = job.ai_audit_results?.[0] ?? null;
                      const isSelected = job.id === selectedJob?.id;

                      return (
                        <tr
                          key={job.id}
                          className={`border-t border-white/6 transition ${
                            isSelected ? "bg-cyan-400/8" : "hover:bg-white/[0.03]"
                          }`}
                        >
                          <td className="px-4 py-4 align-top">
                            <Link
                              href={`/dashboard/ai-audit/history?job=${job.id}`}
                              className="block rounded-2xl px-1 py-1 outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-300/60"
                            >
                              <p className="max-w-[18rem] truncate font-medium text-white">
                                {job.student_documents?.original_filename ?? "未知檔案"}
                              </p>
                            </Link>
                          </td>
                          <td className="px-4 py-4 align-top text-slate-300">
                            {job.student_documents
                              ? formatDocumentType(job.student_documents.document_type)
                              : "未知"}
                          </td>
                          <td className="px-4 py-4 align-top text-slate-200">
                            {formatAuditType(job.audit_type)}
                          </td>
                          <td className="px-4 py-4 align-top text-slate-300">
                            {job.model}
                          </td>
                          <td className="px-4 py-4 align-top">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${riskBadgeClass(
                                result?.risk_level,
                              )}`}
                            >
                              {result?.risk_level ?? "n/a"}
                            </span>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(
                                job.status,
                              )}`}
                            >
                              {formatStatus(job.status)}
                            </span>
                          </td>
                          <td className="px-4 py-4 align-top text-slate-400">
                            {formatDateTime(job.completed_at ?? job.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-slate-950/40">
              {selectedJob ? (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Selected Audit
                    </p>
                    <h2 className="text-2xl font-semibold tracking-tight text-white">
                      {selectedJob.student_documents?.original_filename ?? "未知檔案"}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${riskBadgeClass(
                          selectedResult?.risk_level,
                        )}`}
                      >
                        Risk {selectedResult?.risk_level ?? "n/a"}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(
                          selectedJob.status,
                        )}`}
                      >
                        {formatStatus(selectedJob.status)}
                      </span>
                    </div>
                    <dl className="grid gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                      <div className="flex items-start justify-between gap-4">
                        <dt className="text-slate-500">文件類型</dt>
                        <dd>
                          {selectedJob.student_documents
                            ? formatDocumentType(selectedJob.student_documents.document_type)
                            : "未知"}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <dt className="text-slate-500">稽核模式</dt>
                        <dd>{formatAuditType(selectedJob.audit_type)}</dd>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <dt className="text-slate-500">使用模型</dt>
                        <dd>{selectedJob.model}</dd>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <dt className="text-slate-500">稽核時間</dt>
                        <dd>{formatDateTime(selectedJob.completed_at ?? selectedJob.created_at)}</dd>
                      </div>
                    </dl>
                  </div>

                  {selectedResult ? (
                    <div className="rounded-[1.75rem] border border-white/10 bg-slate-950 px-5 py-5 shadow-inner shadow-black/30">
                      <p className="text-sm font-semibold text-slate-200">
                        {selectedResult.summary}
                      </p>
                      <article
                        className="markdown-body mt-4 rounded-[1.4rem] border border-white/8 bg-[linear-gradient(180deg,#0f172a_0%,#020617_100%)] px-5 py-5 text-[15px] leading-8 text-slate-100 [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.92em] [&_em]:text-slate-200 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-3 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_p]:my-3 [&_strong]:font-semibold [&_strong]:text-white [&_ul]:my-4 [&_ul]:space-y-2"
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdownToHtml(selectedResult.result_markdown),
                        }}
                      />
                    </div>
                  ) : selectedJob.status === "failed" ? (
                    <div className="rounded-[1.75rem] border border-red-300/20 bg-red-400/10 px-5 py-5 text-sm leading-7 text-red-100">
                      <p className="font-semibold">本次稽核未成功完成。</p>
                      <p className="mt-2 text-red-50/85">
                        {selectedJob.error_message ?? "系統沒有留下額外錯誤訊息。"}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] px-5 py-5 text-sm leading-7 text-slate-400">
                      這筆任務目前還沒有可讀取的稽核結果內容。
                    </div>
                  )}
                </div>
              ) : null}
            </aside>
          </section>
        )}
      </section>
    </main>
  );
}
