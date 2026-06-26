"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type RiskLevel = "low" | "medium" | "high";

type LeadSummary = {
  quiz_result: RiskLevel | null;
  quiz_score: number | null;
  main_tags: string[] | null;
  updated_at: string;
};

type AdvisorMemory = {
  id: string;
  thinking_style: string | null;
  frequent_questions: string[] | null;
  raw_content: string;
};

const riskCopy: Record<
  RiskLevel,
  { label: string; className: string; description: string }
> = {
  low: {
    label: "低風險",
    className: "border-emerald-300/30 bg-emerald-500/10 text-emerald-100",
    description: "目前狀態相對穩定，建議維持每週輸出與 Meeting 前提問預演。",
  },
  medium: {
    label: "中風險",
    className: "border-amber-300/30 bg-amber-500/10 text-amber-100",
    description: "已有幾個卡點開始影響節奏，建議本週先處理最直接影響 Meeting 的問題。",
  },
  high: {
    label: "高風險",
    className: "border-red-300/30 bg-red-500/10 text-red-100",
    description: "目前研究節奏可能已經失控，建議先縮小任務並建立下次 Meeting 的問題清單。",
  },
};

const tagLabels: Record<string, string> = {
  tag_literature_blocked: "文獻閱讀卡關",
  tag_advisor_meeting_blocked: "Meeting 壓力",
  tag_presentation_blocked: "簡報失焦",
  tag_tooling_blocked: "工具落差",
  tag_high_stress: "高焦慮",
};

function splitQuestions(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function DashboardPage() {
  const [leadSummary, setLeadSummary] = useState<LeadSummary | null>(null);
  const [memoryId, setMemoryId] = useState("");
  const [advisorStyle, setAdvisorStyle] = useState("");
  const [frequentQuestions, setFrequentQuestions] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      if (!isMounted) return;

      setUserId(user.id);

      const email = user.email?.toLowerCase();

      if (email) {
        const { data: lead } = await supabase
          .from("leads")
          .select("quiz_result,quiz_score,main_tags,updated_at")
          .eq("email", email)
          .not("quiz_result", "is", null)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle<LeadSummary>();

        if (isMounted) {
          setLeadSummary(lead ?? null);
        }
      }

      const { data: memory } = await supabase
        .from("advisor_memories")
        .select("id,thinking_style,frequent_questions,raw_content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<AdvisorMemory>();

      if (isMounted && memory) {
        setMemoryId(memory.id);
        setAdvisorStyle(memory.thinking_style ?? "");
        setFrequentQuestions((memory.frequent_questions ?? []).join("\n"));
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmitAdvisorMemory = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!userId) {
      setMessage("請先登入後再儲存教授記憶庫。");
      return;
    }

    const questions = splitQuestions(frequentQuestions);

    if (!advisorStyle.trim() && questions.length === 0) {
      setMessage("請至少填寫教授偏好風格或常問問題。");
      return;
    }

    setIsSaving(true);
    setMessage("");

    const rawContent = [
      advisorStyle.trim() ? `教授偏好風格：${advisorStyle.trim()}` : "",
      questions.length ? `常問問題：\n${questions.join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const supabase = createClient();
    const payload = {
      user_id: userId,
      source_type: "note",
      raw_content: rawContent,
      thinking_style: advisorStyle.trim() || null,
      frequent_questions: questions,
      general_preferences: advisorStyle.trim() ? [advisorStyle.trim()] : [],
    };

    const { data, error } = memoryId
      ? await supabase
          .from("advisor_memories")
          .update(payload)
          .eq("id", memoryId)
          .select("id")
          .single()
      : await supabase
          .from("advisor_memories")
          .insert(payload)
          .select("id")
          .single();

    setIsSaving(false);

    if (error) {
      setMessage(`儲存失敗：${error.message}`);
      return;
    }

    setMemoryId(data.id);
    setMessage("已儲存指導教授長期記憶庫。下次產生 AI 指令時可手動填入這些偏好。");
  };

  const riskInfo = leadSummary?.quiz_result
    ? riskCopy[leadSummary.quiz_result]
    : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.20),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 py-12 text-white">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-7 shadow-2xl shadow-blue-950/30 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">
            RAPID4GRAD DASHBOARD
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            研究工作台
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            這裡整合畢業風險摘要、指導教授長期記憶庫與核心工具入口。第一版以手動記錄與 AI 指令產生器為主。
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                  Latest Quiz Result
                </p>
                <h2 className="mt-3 text-2xl font-semibold">
                  最近一次畢業狀態檢查
                </h2>
              </div>
              {riskInfo ? (
                <span
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${riskInfo.className}`}
                >
                  {riskInfo.label}
                </span>
              ) : null}
            </div>

            {isLoading ? (
              <p className="mt-5 text-sm text-slate-400">讀取中...</p>
            ) : riskInfo ? (
              <div className="mt-5">
                <p className="text-sm leading-6 text-slate-300">
                  {riskInfo.description}
                </p>
                <p className="mt-4 text-sm text-slate-400">
                  風險分數：{leadSummary?.quiz_score ?? "-"}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {(leadSummary?.main_tags ?? []).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-blue-300/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-100"
                    >
                      {tagLabels[tag] ?? tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <p className="text-sm leading-6 text-slate-400">
                  目前還沒有畢業狀態檢查結果。先完成 7 題檢查，Dashboard 就會顯示你的風險摘要與主要卡點。
                </p>
                <Link
                  href="/quiz"
                  className="mt-5 inline-flex rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400"
                >
                  開始 7 題檢查
                </Link>
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
              Core Tools
            </p>
            <h2 className="mt-3 text-2xl font-semibold">下一步工具</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href="/dashboard/ai-command"
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-blue-300/30 hover:bg-blue-500/10"
              >
                <h3 className="font-semibold">AI 指令產生器</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Meeting 前先產生教授追問與邏輯檢查指令。
                </p>
              </Link>
              <Link
                href="/dashboard/course"
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-blue-300/30 hover:bg-blue-500/10"
              >
                <h3 className="font-semibold">課程觀看頁</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  依 RAPID 五大模組整理研究流程。
                </p>
              </Link>
            </div>
          </div>
        </section>

        <form
          onSubmit={handleSubmitAdvisorMemory}
          className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-7 shadow-2xl shadow-blue-950/20"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">
            Advisor Memory
          </p>
          <h2 className="mt-3 text-2xl font-semibold">
            指導教授長期記憶庫設定
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Phase 1 先用手動筆記記錄教授偏好。未來產生 AI 指令時，這些內容會成為你模擬教授追問的重要素材。
          </p>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-200">
                教授偏好風格
              </span>
              <textarea
                value={advisorStyle}
                onChange={(event) => setAdvisorStyle(event.target.value)}
                rows={7}
                className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/50"
                placeholder="例如：重視前後邏輯、常問對照組、希望報告先講結論、很在意圖表是否支撐主張..."
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-200">
                常問問題（一行一題）
              </span>
              <textarea
                value={frequentQuestions}
                onChange={(event) => setFrequentQuestions(event.target.value)}
                rows={7}
                className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/50"
                placeholder={"你的 control group 是什麼？\n這個指標怎麼定義？\n跟前人研究差在哪？"}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="mt-6 rounded-2xl bg-blue-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "儲存中..." : "儲存教授記憶庫"}
          </button>

          {message ? (
            <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-slate-300">
              {message}
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
