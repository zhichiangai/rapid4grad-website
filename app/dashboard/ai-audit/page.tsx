import Link from "next/link";
import { redirect } from "next/navigation";
import { AuditStreamingPanel } from "@/components/ai-audit/AuditStreamingPanel";
import { AuditSummarySharing } from "@/components/ai-audit/AuditSummarySharing";
import { DocumentUploadForm } from "@/components/ai-audit/DocumentUploadForm";
import { getLabPdfAuditEligibility } from "@/lib/ai/quota";
import { createV2Client } from "@/lib/supabase/server";

type AuditDocument = {
  id: string;
  original_filename: string;
  document_type: string;
  created_at: string;
};

type LabOption = { id: string; name: string };
type ShareRow = { document_id: string; lab_id: string; revoked_at: string | null };

function formatDate(value: string | null | undefined) {
  if (!value) return "尚未建立";

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export default async function AiAuditPage() {
  const supabase = await createV2Client();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/ai-audit");
  }

  const [profileResult, eligibility, documentsResult, membershipResult] =
    await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      getLabPdfAuditEligibility(supabase),
      supabase
        .from("student_documents")
        .select("id,original_filename,document_type,created_at")
        .eq("user_id", user.id)
        .eq("storage_bucket", "student-documents")
        .eq("mime_type", "application/pdf")
        .eq("upload_status", "ready")
        .order("created_at", { ascending: false })
        .limit(20)
        .returns<AuditDocument[]>(),
      supabase
        .from("lab_memberships")
        .select("lab_id")
        .eq("user_id", user.id)
        .eq("role", "student")
        .eq("status", "active")
        .maybeSingle(),
    ]);

  const isStudent = profileResult.data?.role === "student";
  const documents = documentsResult.data ?? [];
  const activeLabId = membershipResult.data?.lab_id ?? null;
  const { data: activeLab } = activeLabId
    ? await supabase
        .from("labs")
        .select("id,name")
        .eq("id", activeLabId)
        .maybeSingle<LabOption>()
    : { data: null };

  const documentIds = documents.map((document) => document.id);
  const { data: shareRows } = documentIds.length
    ? await supabase
        .from("audit_summary_shares")
        .select("document_id,lab_id,revoked_at")
        .in("document_id", documentIds)
        .returns<ShareRow[]>()
    : { data: [] as ShareRow[] };

  const balance = eligibility.balance;
  const canUseAudit = isStudent && eligibility.allowed;
  const reason = !isStudent
    ? "PDF AI 稽核只提供給有效 Professor Lab 內的學生使用。"
    : eligibility.reason;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] px-4 py-12 text-white">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-7 shadow-2xl shadow-slate-950/40">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
            LAB PDF SHARED POOL
          </p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">
                研究 PDF 上傳與 AI 稽核
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
                僅限有效 Professor Lab 的 active student。PDF 永遠屬於學生本人並保存在
                private Storage；每次成功稽核才從 Lab 共用額度結算一次。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/ai-command"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-400/10"
              >
                Phase 1 fallback
              </Link>
              <Link
                href="/dashboard/ai-audit/history"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-400/10"
              >
                查看稽核歷史
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-500">目前 Lab</p>
            <p className="mt-2 text-lg font-semibold">
              {activeLab?.name ?? "尚未加入 Lab"}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-500">使用資格</p>
            <p className="mt-2 text-lg font-semibold">
              {canUseAudit ? "可使用" : "目前停用"}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-500">Lab 共用額度</p>
            <p className="mt-2 text-lg font-semibold">
              {balance
                ? `${balance.used} 已用 · ${balance.reserved} 處理中 · ${balance.remaining} 剩餘`
                : "尚未建立"}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-500">本期額度週期</p>
            <p className="mt-2 text-lg font-semibold">
              {balance
                ? `${formatDate(balance.periodStart)} - ${formatDate(balance.periodEnd)}`
                : "尚未建立"}
            </p>
          </div>
        </section>

        {reason ? (
          <p className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-5 py-4 text-sm leading-7 text-amber-100">
            {reason}
          </p>
        ) : null}

        <DocumentUploadForm
          canUpload={canUseAudit}
          reason={reason}
          remainingPdfAudits={balance?.remaining ?? 0}
        />

        <AuditStreamingPanel canAudit={canUseAudit} documents={documents} />

        <AuditSummarySharing
          documents={documents.map((document) => ({
            id: document.id,
            original_filename: document.original_filename,
          }))}
          labs={activeLab ? [activeLab] : []}
          initialShares={(shareRows ?? []).map((share) => ({
            documentId: share.document_id,
            labId: share.lab_id,
            shared: share.revoked_at === null,
          }))}
        />
      </section>
    </main>
  );
}
