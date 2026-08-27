import Link from "next/link";
import { AiCommandContainer } from "@/components/ai-command/AiCommandContainer";
import { createClient } from "@/lib/supabase/server";
import type { PromptTemplate } from "@/lib/prompt-builder/types";

export const metadata = { title: "AI Research Prompt Pack" };

export default async function PublicAiCommandPage() {
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
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                把研究問題交給 RAPID，一次準備好 4 大 AI 的研究 Prompt
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                選一個研究任務，必要時補一句你的狀況。RAPID 會一次產生 ChatGPT、Claude、Gemini、Grok 四套研究工作流程，每套 5 段可以直接複製的 Prompt。
              </p>
              <p className="mt-2 text-xs text-slate-500">研究檔案不會上傳到 RAPID；生成的 Prompt 由瀏覽器本地組合。</p>
              <p className="mt-1 text-xs text-slate-500">
                未登入可免費產生 20 次，完成 Email 驗證或登入後不限次使用。
              </p>
            </div>
            <Link
              href="/login?next=/dashboard/ai-command"
              className="rounded-full border border-blue-300/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/20"
            >
              登入以保存使用狀態
            </Link>
          </div>
        </header>
      </div>

      <AiCommandContainer
        isDashboardRoute={false}
        activePromptTemplates={activePromptTemplates}
        promptTemplateLoadError={promptTemplateError?.message}
      />
    </main>
  );
}
