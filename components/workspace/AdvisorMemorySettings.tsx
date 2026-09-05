"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function splitQuestions(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

export function AdvisorMemorySettings() {
  const [userId, setUserId] = useState("");
  const [memoryId, setMemoryId] = useState("");
  const [advisorStyle, setAdvisorStyle] = useState("");
  const [frequentQuestions, setFrequentQuestions] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login?next=/dashboard/advisor-profile";
        return;
      }
      const { data: memory } = await supabase.from("advisor_memories").select("id,preference_style,common_questions").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!mounted) return;
      setUserId(user.id);
      setMemoryId(memory?.id ?? "");
      setAdvisorStyle(memory?.preference_style ?? "");
      setFrequentQuestions((memory?.common_questions ?? []).join("\n"));
      setIsLoading(false);
    }
    void load();
    return () => { mounted = false; };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const questions = splitQuestions(frequentQuestions);
    if (!advisorStyle.trim() && questions.length === 0) {
      setMessage("請至少填寫教授偏好風格或常問問題。");
      return;
    }
    setIsSaving(true);
    setMessage("");
    const supabase = createClient();
    const payload = { user_id: userId, preference_style: advisorStyle.trim() || null, common_questions: questions, custom_notes: [advisorStyle.trim() ? `教授偏好風格：${advisorStyle.trim()}` : "", questions.length ? `常問問題：\n${questions.join("\n")}` : ""].filter(Boolean).join("\n\n") || null };
    const result = memoryId ? await supabase.from("advisor_memories").update(payload).eq("id", memoryId).select("id").single() : await supabase.from("advisor_memories").insert(payload).select("id").single();
    setIsSaving(false);
    if (result.error) {
      setMessage("儲存失敗，請稍後再試。");
      return;
    }
    setMemoryId(result.data.id);
    setMessage("已儲存教授偏好。下次產生 AI 指令時可以手動套用這些內容。");
  }

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.18),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 py-8 text-white sm:py-12"><section className="mx-auto w-full max-w-4xl"><Link href="/dashboard" className="text-sm font-semibold text-cyan-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">← 回研究工作台</Link><header className="mt-6 rounded-[2rem] border border-cyan-300/20 bg-slate-950/85 p-7"><p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">ADVISOR PREFERENCES</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">教授偏好</h1><p className="mt-3 text-sm leading-6 text-slate-400">記下教授常見的提問方式與回饋偏好，之後準備研究指令時可以更貼近你的 Meeting 情境。</p></header><form onSubmit={save} className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-7"><p className="text-sm leading-6 text-slate-400">這些內容只屬於你的研究工作區，不會改變論文進度或畢業風險判斷。</p>{isLoading ? <p className="mt-6 text-sm text-slate-400">讀取中...</p> : <><div className="mt-6 grid gap-5"><label className="block"><span className="text-sm font-medium text-slate-200">教授偏好風格</span><textarea value={advisorStyle} onChange={(event) => setAdvisorStyle(event.target.value)} rows={7} className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/50 focus-visible:ring-2 focus-visible:ring-cyan-300/30" placeholder="例如：重視前後邏輯、常問對照組、希望報告先講結論..." /></label><label className="block"><span className="text-sm font-medium text-slate-200">常問問題（一行一題）</span><textarea value={frequentQuestions} onChange={(event) => setFrequentQuestions(event.target.value)} rows={7} className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/50 focus-visible:ring-2 focus-visible:ring-cyan-300/30" placeholder={"你的 control group 是什麼？\n這個指標怎麼定義？\n跟前人研究差在哪？"} /></label></div><button type="submit" disabled={isSaving} className="mt-6 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "儲存中..." : "儲存教授偏好"}</button>{message ? <p role="status" className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm leading-6 text-slate-300">{message}</p> : null}</>}</form></section></main>;
}
