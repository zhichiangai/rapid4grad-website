"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type TemplateRow = {
  id: string;
  target_ai: string;
  template_type: string;
  system_role: string;
  task_template: string;
  official_doc_notes: string | null;
  is_active: boolean;
  version: number;
};

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [systemRole, setSystemRole] = useState("");
  const [taskTemplate, setTaskTemplate] = useState("");
  const [officialDocNotes, setOfficialDocNotes] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const selectedTemplate = templates.find((template) => template.id === selectedId);

  useEffect(() => {
    async function loadTemplates() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("prompt_templates")
        .select(
          "id,target_ai,template_type,system_role,task_template,official_doc_notes,is_active,version",
        )
        .order("target_ai", { ascending: true })
        .order("template_type", { ascending: true });

      if (error) {
        setMessage(`讀取失敗：${error.message}`);
      } else {
        const rows = (data ?? []) as TemplateRow[];
        setTemplates(rows);
        if (rows[0]) {
          setSelectedId(rows[0].id);
          setSystemRole(rows[0].system_role);
          setTaskTemplate(rows[0].task_template);
          setOfficialDocNotes(rows[0].official_doc_notes ?? "");
        }
      }
      setIsLoading(false);
    }

    void loadTemplates();
  }, []);

  const handleSelect = (id: string) => {
    const template = templates.find((item) => item.id === id);
    setSelectedId(id);
    setSystemRole(template?.system_role ?? "");
    setTaskTemplate(template?.task_template ?? "");
    setOfficialDocNotes(template?.official_doc_notes ?? "");
    setMessage("");
  };

  const handleSave = async () => {
    if (!selectedTemplate) {
      setMessage("請先選擇模板。");
      return;
    }

    setIsSaving(true);
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase
      .from("prompt_templates")
      .update({
        system_role: systemRole,
        task_template: taskTemplate,
        official_doc_notes: officialDocNotes || null,
        version: selectedTemplate.version + 1,
      })
      .eq("id", selectedTemplate.id);

    setIsSaving(false);

    if (error) {
      setMessage(`儲存失敗：${error.message}`);
      return;
    }

    setTemplates((current) =>
      current.map((template) =>
        template.id === selectedTemplate.id
          ? {
              ...template,
              system_role: systemRole,
              task_template: taskTemplate,
              official_doc_notes: officialDocNotes || null,
              version: template.version + 1,
            }
          : template,
      ),
    );
    setMessage("模板已更新。");
  };

  return (
    <section className="grid gap-5 lg:grid-cols-[20rem_1fr]">
      <aside className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-2xl shadow-blue-950/20">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
          Prompt CMS
        </p>
        <h2 className="mt-2 text-2xl font-semibold">模板清單</h2>
        <div className="mt-5 space-y-2">
          {isLoading ? (
            <p className="text-sm text-slate-400">讀取中...</p>
          ) : (
            templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleSelect(template.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  selectedId === template.id
                    ? "border-blue-300/40 bg-blue-500/10"
                    : "border-white/10 bg-white/[0.035] hover:bg-white/[0.06]"
                }`}
              >
                <p className="text-sm font-semibold text-white">
                  {template.target_ai} / {template.template_type}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  v{template.version} · {template.is_active ? "active" : "inactive"}
                </p>
              </button>
            ))
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
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !selectedTemplate}
            className="rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400 disabled:opacity-70"
          >
            {isSaving ? "儲存中..." : "儲存模板"}
          </button>
        </div>

        {message ? (
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
            {message}
          </p>
        ) : null}

        <div className="mt-5 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-200">
              System Role
            </span>
            <textarea
              value={systemRole}
              onChange={(event) => setSystemRole(event.target.value)}
              rows={7}
              className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-sm leading-6 text-white outline-none focus:border-blue-300/50"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-200">
              Task Template
            </span>
            <textarea
              value={taskTemplate}
              onChange={(event) => setTaskTemplate(event.target.value)}
              rows={10}
              className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-sm leading-6 text-white outline-none focus:border-blue-300/50"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-200">
              Official Doc Notes
            </span>
            <textarea
              value={officialDocNotes}
              onChange={(event) => setOfficialDocNotes(event.target.value)}
              rows={5}
              className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none focus:border-blue-300/50"
            />
          </label>
        </div>
      </section>
    </section>
  );
}
