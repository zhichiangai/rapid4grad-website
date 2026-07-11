import Link from "next/link";
import { redirect } from "next/navigation";
import { AuditStreamingPanel } from "@/components/ai-audit/AuditStreamingPanel";
import { AuditSummarySharing } from "@/components/ai-audit/AuditSummarySharing";
import { DocumentUploadForm } from "@/components/ai-audit/DocumentUploadForm";
import { createClient } from "@/lib/supabase/server";

type ActiveSubscription = {
  id: string;
  status: "active" | "trialing" | "past_due" | "canceled" | "unpaid";
  current_period_start: string;
  current_period_end: string;
};

type ActiveCredit = {
  pdf_audit_limit: number;
  pdf_audit_used: number;
  period_start: string;
  period_end: string;
};

type AuditDocument = {
  id: string;
  original_filename: string;
  document_type: string;
  created_at: string;
};

type LabOption = { id: string; name: string };
type ShareRow = { document_id: string; lab_id: string; revoked_at: string | null };

function isActivePeriod(start: string, end: string) {
  const now = Date.now();
  return new Date(start).getTime() <= now && now < new Date(end).getTime();
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "尚未建立";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export default async function AiAuditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/ai-audit");
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id,status,current_period_start,current_period_end")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle<ActiveSubscription>();

  const hasActiveSubscription = Boolean(
    subscription &&
      isActivePeriod(
        subscription.current_period_start,
        subscription.current_period_end,
      ),
  );

  const { data: credits } = subscription
    ? await supabase
        .from("ai_usage_credits")
        .select("pdf_audit_limit,pdf_audit_used,period_start,period_end")
        .eq("user_id", user.id)
        .eq("subscription_id", subscription.id)
        .order("period_end", { ascending: false })
        .limit(1)
        .maybeSingle<ActiveCredit>()
    : { data: null };

  const hasActiveCreditPeriod = Boolean(
    credits && isActivePeriod(credits.period_start, credits.period_end),
  );
  const remainingPdfAudits = Math.max(
    0,
    (credits?.pdf_audit_limit ?? 0) - (credits?.pdf_audit_used ?? 0),
  );
  const canUpload =
    hasActiveSubscription && hasActiveCreditPeriod && remainingPdfAudits > 0;
  const reason = !hasActiveSubscription
    ? "需要有效的 Phase 2 訂閱才能使用平台內 PDF AI 稽核。"
    : !hasActiveCreditPeriod
      ? "目前沒有有效的 AI audit 額度週期，請確認 Stripe Billing webhook 是否已同步。"
      : remainingPdfAudits <= 0
        ? "本期 PDF audit 額度已用完。"
        : null;
  const { data: documents } = await supabase
    .from("student_documents")
    .select("id,original_filename,document_type,created_at")
    .eq("user_id", user.id)
    .eq("storage_bucket", "student-documents")
    .eq("mime_type", "application/pdf")
    .eq("upload_status", "ready")
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<AuditDocument[]>();

  const { data: memberships } = await supabase
    .from("lab_memberships")
    .select("lab_id")
    .eq("user_id", user.id)
    .eq("role", "student")
    .eq("status", "active");
  const labIds = (memberships ?? []).map((membership) => membership.lab_id);
  const { data: labs } = labIds.length
    ? await supabase.from("labs").select("id,name").in("id", labIds).returns<LabOption[]>()
    : { data: [] as LabOption[] };
  const documentIds = (documents ?? []).map((document) => document.id);
  const { data: shareRows } = documentIds.length
    ? await supabase
        .from("audit_summary_shares")
        .select("document_id,lab_id,revoked_at")
        .in("document_id", documentIds)
        .returns<ShareRow[]>()
    : { data: [] as ShareRow[] };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] px-4 py-12 text-white">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-7 shadow-2xl shadow-slate-950/40">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
            PHASE 2 AI AUDIT
          </p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">
                研究 PDF 上傳與 AI 稽核
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
                這是 Phase 2 的平台內 PDF 稽核入口。檔案會先進入 private
                Storage bucket 並建立 metadata，後續 AI audit route
                才會在 server 端讀取 PDF 並轉為 Base64 多模態輸入。
              </p>
            </div>
            <Link
              href="/dashboard/ai-command"
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-400/10"
            >
              Phase 1 fallback：AI 指令產生器
            </Link>
            <Link
              href="/dashboard/ai-audit/history"
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-400/10"
            >
              查看稽核歷史
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-500">訂閱狀態</p>
            <p className="mt-2 text-lg font-semibold">
              {hasActiveSubscription ? "可使用" : "未啟用"}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-500">PDF Audit 額度</p>
            <p className="mt-2 text-lg font-semibold">
              {credits?.pdf_audit_used ?? 0} / {credits?.pdf_audit_limit ?? 0}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-500">額度週期</p>
            <p className="mt-2 text-lg font-semibold">
              {credits
                ? `${formatDate(credits.period_start)} - ${formatDate(
                    credits.period_end,
                  )}`
                : "尚未建立"}
            </p>
          </div>
        </section>

        <DocumentUploadForm
          canUpload={canUpload}
          reason={reason}
          remainingPdfAudits={remainingPdfAudits}
        />

        <AuditStreamingPanel
          canAudit={canUpload}
          documents={documents ?? []}
        />

        <AuditSummarySharing
          documents={(documents ?? []).map((document) => ({
            id: document.id,
            original_filename: document.original_filename,
          }))}
          labs={labs ?? []}
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
