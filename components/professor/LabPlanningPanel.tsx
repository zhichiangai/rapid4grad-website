"use client";

import { useState } from "react";

export type LabMilestone = { id: string; lab_id: string; title: string; description: string | null; target_date: string; status: "active" | "completed" | "canceled" | "archived"; created_by: string; created_at: string; updated_at: string };
export type LabResource = { id: string; lab_id: string; title: string; description: string | null; category: string | null; resource_url: string; created_by: string; created_at: string; updated_at: string; archived_at: string | null };

function fieldClass() {
  return "mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:opacity-50";
}

async function requestJson(url: string, method: "POST" | "PATCH", body: Record<string, unknown>) {
  const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({})) as { success?: boolean; error?: string; milestone?: LabMilestone; resource?: LabResource };
  if (!response.ok || !result.success) throw new Error(result.error ?? "儲存失敗，請稍後再試。");
  return result;
}

export function LabPlanningPanel({ labId, initialMilestones, initialResources, canManage, readOnlyReason }: { labId: string; initialMilestones: LabMilestone[]; initialResources: LabResource[]; canManage: boolean; readOnlyReason?: string }) {
  const [milestones, setMilestones] = useState(initialMilestones);
  const [resources, setResources] = useState(initialResources);
  const [milestonePending, setMilestonePending] = useState(false);
  const [resourcePending, setResourcePending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function createMilestone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMilestonePending(true); setMessage(null);
    const form = new FormData(event.currentTarget);
    try {
      const result = await requestJson(`/api/professor/labs/${labId}/milestones`, "POST", { title: form.get("title"), targetDate: form.get("targetDate"), description: form.get("description") });
      if (result.milestone) setMilestones((current) => [result.milestone!, ...current]);
      event.currentTarget.reset(); setMessage("里程碑已建立。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "里程碑建立失敗。"); }
    finally { setMilestonePending(false); }
  }

  async function updateMilestone(milestone: LabMilestone, status: LabMilestone["status"]) {
    setMessage(null);
    try {
      const result = await requestJson(`/api/professor/labs/${labId}/milestones/${milestone.id}`, "PATCH", { status });
      if (result.milestone) setMilestones((current) => current.map((item) => item.id === milestone.id ? result.milestone! : item));
    } catch (error) { setMessage(error instanceof Error ? error.message : "里程碑更新失敗。"); }
  }

  async function createResource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResourcePending(true); setMessage(null);
    const form = new FormData(event.currentTarget);
    try {
      const result = await requestJson(`/api/professor/labs/${labId}/resources`, "POST", { title: form.get("title"), resourceUrl: form.get("resourceUrl"), category: form.get("category"), description: form.get("description") });
      if (result.resource) setResources((current) => [result.resource!, ...current]);
      event.currentTarget.reset(); setMessage("Lab Resource 已建立。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "資源建立失敗。"); }
    finally { setResourcePending(false); }
  }

  async function archiveResource(resource: LabResource) {
    setMessage(null);
    try {
      const result = await requestJson(`/api/professor/labs/${labId}/resources/${resource.id}`, "PATCH", { archive: true });
      if (result.resource) setResources((current) => current.filter((item) => item.id !== resource.id));
    } catch (error) { setMessage(error instanceof Error ? error.message : "資源封存失敗。"); }
  }

  return <section className="mt-8 grid gap-6 lg:grid-cols-2">
    <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
      <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">Lab Milestones</p><h2 className="mt-2 text-2xl font-semibold">研究里程碑</h2></div><span className="text-sm text-slate-500">{milestones.filter((item) => item.status === "active").length} 個進行中</span></div>
      {canManage ? <form onSubmit={createMilestone} className="mt-5 space-y-3 rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.04] p-4"><label className="block text-sm text-slate-200">標題<input name="title" required maxLength={200} disabled={milestonePending} className={fieldClass()} /></label><label className="block text-sm text-slate-200">目標日期<input name="targetDate" required type="date" disabled={milestonePending} className={fieldClass()} /></label><label className="block text-sm text-slate-200">描述（選填）<textarea name="description" maxLength={2000} disabled={milestonePending} className={`${fieldClass()} min-h-20`} /></label><button type="submit" disabled={milestonePending} className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{milestonePending ? "建立中..." : "新增里程碑"}</button></form> : <p className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">{readOnlyReason ?? "目前為唯讀模式。"}</p>}
      <div className="mt-5 space-y-3">{milestones.length ? milestones.slice(0, 8).map((milestone) => <div key={milestone.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-white">{milestone.title}</p><p className="mt-1 text-sm text-slate-400">目標 {milestone.target_date}</p></div><span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-1 text-xs text-cyan-100">{milestone.status}</span></div>{milestone.description ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{milestone.description}</p> : null}{canManage && milestone.status === "active" ? <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => updateMilestone(milestone, "completed")} className="rounded-xl border border-emerald-300/20 px-3 py-2 text-xs font-semibold text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">標記完成</button><button type="button" onClick={() => updateMilestone(milestone, "archived")} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">封存</button></div> : null}</div>) : <p className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-500">尚無里程碑。</p>}</div>
    </article>
    <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
      <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">Lab Resources</p><h2 className="mt-2 text-2xl font-semibold">研究資源</h2></div><span className="text-sm text-slate-500">URL／文字說明</span></div>
      {canManage ? <form onSubmit={createResource} className="mt-5 space-y-3 rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.04] p-4"><label className="block text-sm text-slate-200">標題<input name="title" required maxLength={200} disabled={resourcePending} className={fieldClass()} /></label><label className="block text-sm text-slate-200">網址<input name="resourceUrl" required type="url" placeholder="https://" disabled={resourcePending} className={fieldClass()} /></label><label className="block text-sm text-slate-200">分類（選填）<input name="category" maxLength={100} disabled={resourcePending} className={fieldClass()} /></label><label className="block text-sm text-slate-200">描述（選填）<textarea name="description" maxLength={2000} disabled={resourcePending} className={`${fieldClass()} min-h-20`} /></label><button type="submit" disabled={resourcePending} className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{resourcePending ? "建立中..." : "新增資源"}</button></form> : <p className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">{readOnlyReason ?? "目前為唯讀模式。"}</p>}
      <div className="mt-5 space-y-3">{resources.length ? resources.slice(0, 8).map((resource) => <div key={resource.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-white">{resource.title}</p><a href={resource.resource_url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-sm text-cyan-200 hover:text-white">{resource.resource_url}</a></div>{canManage ? <button type="button" onClick={() => archiveResource(resource)} className="shrink-0 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">封存</button> : null}</div>{resource.description ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{resource.description}</p> : null}</div>) : <p className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-500">尚無研究資源。</p>}</div>
    </article>
    {message ? <p className="lg:col-span-2 text-sm text-cyan-100" role="status">{message}</p> : null}
  </section>;
}
