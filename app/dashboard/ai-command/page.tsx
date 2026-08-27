import { AiCommandContainer } from "@/components/ai-command/AiCommandContainer";
import { createClient } from "@/lib/supabase/server";
import type { PromptTemplate } from "@/lib/prompt-builder/types";

export default async function AiCommandPage() {
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
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Meeting、投稿、口試前，先讓 AI 幫你找出問題
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            選擇你現在正在準備的研究任務，RAPID 會替你整理成可直接貼到 ChatGPT、Claude、Gemini 或 Grok 的研究指令。
          </p>
          <p className="mt-2 text-xs text-slate-500">不需要把研究檔案上傳到 RAPID。</p>
        </header>
      </div>

      <AiCommandContainer
        isDashboardRoute
        activePromptTemplates={activePromptTemplates}
        promptTemplateLoadError={promptTemplateError?.message}
      />
    </main>
  );
}
