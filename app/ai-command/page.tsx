import Link from "next/link";
import { cookies } from "next/headers";
import { AiCommandContainer } from "@/components/ai-command/AiCommandContainer";
import { createClient } from "@/lib/supabase/server";
import type { PromptTemplate } from "@/lib/prompt-builder/types";

const ANONYMOUS_TRIAL_COOKIE = "rapid_anon_ai_trial_used";

export default async function PublicAiCommandPage() {
  const cookieStore = await cookies();
  const hasUsedAnonymousTrial =
    cookieStore.get(ANONYMOUS_TRIAL_COOKIE)?.value === "true";
  const supabase = await createClient();
  const { data: promptTemplates, error: promptTemplateError } = await supabase
    .from("prompt_templates")
    .select(
      "id,target_ai,template_type,system_role,context_template,task_template,output_template,official_doc_notes,version",
    )
    .eq("is_active", true);

  const activePromptTemplates: PromptTemplate[] = (promptTemplates ?? []).map(
    (template) => ({
      id: template.id,
      targetAi: template.target_ai,
      templateType: template.template_type,
      systemRole: template.system_role,
      contextTemplate: template.context_template,
      taskTemplate: template.task_template,
      outputTemplate: template.output_template,
      officialDocNotes: template.official_doc_notes,
      version: template.version,
    }),
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <header className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-blue-950/20">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">
                RAPID4GRAD FREE TOOL
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                研究報告 AI 指令產生器
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                第一次可免登入直接試用。第 2 次起需完成 Email 驗證；付費學員登入後可解除免費額度限制。
              </p>
            </div>
            <Link
              href="/login?next=/dashboard/ai-command"
              className="rounded-full border border-blue-300/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/20"
            >
              Google 登入
            </Link>
          </div>
        </header>
      </div>

      <AiCommandContainer
        initialAnonymousTrialUsed={hasUsedAnonymousTrial}
        isDashboardRoute={false}
        activePromptTemplates={activePromptTemplates}
        promptTemplateLoadError={promptTemplateError?.message}
      />
    </main>
  );
}
