import { savePromptTemplate } from "../actions";
import { AdminConfirmAction } from "@/components/admin/AdminConfirmAction";
import { requireAdminContext } from "@/lib/admin/authorization";
import { resolveAdminMessage } from "@/lib/admin/messages";
import type {
  PromptTemplateTargetAi,
  PromptTemplateType,
} from "@/types/database";

type AdminTemplatesSearchParams = Promise<{
  selected?: string;
  message?: string;
}>;

type TemplateRow = {
  id: string;
  target_ai: PromptTemplateTargetAi;
  template_type: PromptTemplateType;
  system_role: string;
  context_template: string;
  task_template: string;
  output_template: string;
  official_doc_notes: string | null;
  is_active: boolean;
  version: number;
  updated_at: string;
};

export default async function AdminTemplatesPage({
  searchParams,
}: {
  searchParams: AdminTemplatesSearchParams;
}) {
  const params = await searchParams;
  const { admin } = await requireAdminContext("/admin/templates");
  const { data, error } = await admin
    .from("prompt_templates")
    .select(
      "id,target_ai,template_type,system_role,context_template,task_template,output_template,official_doc_notes,is_active,version,updated_at",
    )
    .eq("is_active", true)
    .order("target_ai", { ascending: true })
    .order("template_type", { ascending: true });

  const templates = (data ?? []) as TemplateRow[];
  const selectedTemplate =
    templates.find((template) => template.id === params.selected) ??
    templates[0] ??
    null;
  if (error) console.error("[admin-templates] Template lookup failed", { code: error.code });
  const message = resolveAdminMessage(params.message);

  return (
    <section className="grid gap-5 lg:grid-cols-[20rem_1fr]">
      <aside className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-2xl shadow-blue-950/20">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
          Prompt CMS
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Active 模板清單</h2>

        <div className="mt-5 space-y-2">
          {templates.length ? (
            templates.map((template) => (
              <a
                key={template.id}
                href={`/admin/templates?selected=${template.id}`}
                className={`block w-full rounded-2xl border px-4 py-3 text-left transition ${
                  selectedTemplate?.id === template.id
                    ? "border-blue-300/40 bg-blue-500/10"
                    : "border-white/10 bg-white/[0.035] hover:bg-white/[0.06]"
                }`}
              >
                <p className="text-sm font-semibold text-white">
                  {template.target_ai} / {template.template_type}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  v{template.version} · active ·{" "}
                  {new Date(template.updated_at).toLocaleDateString("zh-TW")}
                </p>
              </a>
            ))
          ) : (
            <p className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-slate-400">
              目前沒有 active prompt template。AI 指令產生器會 fallback 到本地模板。
            </p>
          )}
        </div>
      </aside>

      <section className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-2xl shadow-blue-950/20">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
              Template Editor
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              {selectedTemplate
                ? `${selectedTemplate.target_ai} / ${selectedTemplate.template_type}`
                : "請選擇模板"}
            </h2>
          </div>
          {selectedTemplate ? (
            <span className="rounded-full border border-blue-300/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-100">
              Current v{selectedTemplate.version}
            </span>
          ) : null}
        </div>

        {message ? (
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            目前無法讀取 Prompt 模板，請稍後再試。
          </p>
        ) : null}

        {selectedTemplate ? (
          <form action={savePromptTemplate} className="mt-5 space-y-5">
            <input
              type="hidden"
              name="templateId"
              value={selectedTemplate.id}
            />

            <label className="block">
              <span className="text-sm font-medium text-slate-200">
                System Role
              </span>
              <textarea
                name="systemRole"
                defaultValue={selectedTemplate.system_role}
                rows={7}
                className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-sm leading-6 text-white outline-none focus:border-blue-300/50"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-200">
                Context Template
              </span>
              <textarea
                name="contextTemplate"
                defaultValue={selectedTemplate.context_template}
                rows={7}
                className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-sm leading-6 text-white outline-none focus:border-blue-300/50"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-200">
                Task Template
              </span>
              <textarea
                name="taskTemplate"
                defaultValue={selectedTemplate.task_template}
                rows={9}
                className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-sm leading-6 text-white outline-none focus:border-blue-300/50"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-200">
                Output Template
              </span>
              <textarea
                name="outputTemplate"
                defaultValue={selectedTemplate.output_template}
                rows={8}
                className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-sm leading-6 text-white outline-none focus:border-blue-300/50"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-200">
                Official Doc Notes
              </span>
              <textarea
                name="officialDocNotes"
                defaultValue={selectedTemplate.official_doc_notes ?? ""}
                rows={5}
                className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none focus:border-blue-300/50"
              />
            </label>

            <AdminConfirmAction
              confirmationToken="CONFIRM_TEMPLATE_UPDATE"
              buttonLabel="儲存模板並 version + 1"
              dialogTitle="確認更新 Active Prompt 模板？"
              dialogDescription="新內容會影響後續 AI 指令產生，但不會修改既有歷史輸出。"
              reasonPlaceholder="例如：依最新模型官方指引調整輸出格式"
            />
          </form>
        ) : null}
      </section>
    </section>
  );
}
