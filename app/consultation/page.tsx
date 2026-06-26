"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type FormState = "idle" | "submitting" | "success" | "error";

export default function ConsultationPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [lineId, setLineId] = useState("");
  const [blocker, setBlocker] = useState("");
  const [status, setStatus] = useState<FormState>("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !lineId.trim() || !blocker.trim()) {
      setStatus("error");
      setMessage("請完整填寫姓名、Email、LINE ID 與目前最大卡點。");
      return;
    }

    setStatus("submitting");
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.from("leads").insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      lead_status: "consulted",
      utm_source: "consultation_page",
      utm_medium: "owned_website",
      utm_campaign: "one_on_one_consultation",
      main_tags: ["tag_consultation_requested"],
      current_year: `LINE: ${lineId.trim()} | 卡點: ${blocker.trim()}`,
    });

    if (error) {
      setStatus("error");
      setMessage(
        error.code === "23505"
          ? "這個 Email 已經留下過資料。若要補充卡點，請改用另一個 Email，或之後直接透過 LINE 聯繫。"
          : "送出失敗，請稍後再試一次。",
      );
      return;
    }

    setStatus("success");
    setMessage("已收到你的諮詢需求。請接著加入 LINE，方便後續確認研究卡點與適合的協助方式。");
    setName("");
    setEmail("");
    setLineId("");
    setBlocker("");
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.24),transparent_34rem),radial-gradient(circle_at_80%_10%,rgba(6,182,212,0.14),transparent_28rem),linear-gradient(180deg,#020617_0%,#0f172a_52%,#020617_100%)] px-4 py-12 text-white">
      <section className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">
            1:1 Consultation
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            如果你已經卡到不知道下一步，先把問題說清楚
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
            一對一諮詢不是幫你代寫，而是協助你整理目前研究最大的卡點：
            題目是否穩、Meeting 怎麼準備、簡報故事線是否清楚、AI
            指令是否問對問題。
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {["題目與 gap 不穩", "Meeting 前高度焦慮", "簡報被打斷修不完", "不知道怎麼用 AI 檢查報告"].map(
              (item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-200"
                >
                  {item}
                </div>
              ),
            )}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-blue-950/30 backdrop-blur"
        >
          <h2 className="text-2xl font-semibold tracking-tight">
            預約諮詢需求
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            填完後會先記錄到後台名單。後續請依頁面提示加入 LINE，方便確認細節。
          </p>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-200">姓名</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/50"
                placeholder="你的姓名"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-200">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/50"
                placeholder="you@example.com"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-200">
                LINE ID
              </span>
              <input
                value={lineId}
                onChange={(event) => setLineId(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/50"
                placeholder="方便後續聯繫的 LINE ID"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-200">
                目前研究碰到的最大卡點
              </span>
              <textarea
                value={blocker}
                onChange={(event) => setBlocker(event.target.value)}
                rows={5}
                className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/50"
                placeholder="例如：論文題目一直被改、Meeting 前不知道教授會問什麼、簡報邏輯一直被打斷..."
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={status === "submitting"}
            className="mt-6 w-full rounded-2xl bg-blue-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === "submitting" ? "送出中..." : "送出諮詢需求"}
          </button>

          {message ? (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm leading-6 ${
                status === "success"
                  ? "border-emerald-300/20 bg-emerald-500/10 text-emerald-100"
                  : "border-red-300/20 bg-red-500/10 text-red-100"
              }`}
            >
              {message}
              {status === "success" ? (
                <p className="mt-3">
                  LINE 加入連結之後可放在這裡。你也可以先回到{" "}
                  <Link href="/guide" className="text-blue-200 underline">
                    畢業避坑指南
                  </Link>
                  ，確認自己的卡點分類。
                </p>
              ) : null}
            </div>
          ) : null}
        </form>
      </section>
    </main>
  );
}
