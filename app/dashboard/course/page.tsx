import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const modules = [
  {
    key: "Research",
    title: "Research",
    subtitle: "文獻、研究缺口與題目路線",
    lessons: ["讀出 Research Gap", "把題目拆成可驗證問題", "Meeting 前研究路線檢查"],
  },
  {
    key: "Application",
    title: "Application",
    subtitle: "AI、Zotero 與研究工具流",
    lessons: ["AI 指令四段式", "Zotero / EndNote 最小工作流", "外部 AI 檢查報告流程"],
  },
  {
    key: "Presentation",
    title: "Presentation",
    subtitle: "組會、口試與簡報故事線",
    lessons: ["三段式研究簡報", "圖表如何支撐結論", "口試前預演問題清單"],
  },
  {
    key: "Interpersonal",
    title: "Interpersonal",
    subtitle: "教授 Meeting 與溝通策略",
    lessons: ["Meeting 前準備三句話", "教授常問問題資料庫", "被打斷時如何回到主線"],
  },
  {
    key: "Direction",
    title: "Direction",
    subtitle: "畢業節奏、焦慮與下一步",
    lessons: ["每週研究產出定義", "延畢風險拆解", "下週行動排程"],
  },
];

export default async function DashboardCoursePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/course");
  }

  const now = new Date().toISOString();
  const [{ data: profile }, { data: activeAccess }] = await Promise.all([
    supabase
      .from("profiles")
      .select("is_paid,course_expires_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("course_access")
      .select("id,expires_at")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .gt("expires_at", now)
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const profileHasAccess =
    profile?.is_paid === true &&
    Boolean(profile.course_expires_at) &&
    new Date(profile.course_expires_at as string).getTime() > Date.now();

  if (!profileHasAccess && !activeAccess) {
    redirect("/course?reason=course-access-required");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 py-10 text-white">
      <section className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[20rem_1fr]">
        <aside className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-2xl shadow-blue-950/20">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">
            RAPID Course
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            五大模組
          </h1>
          <div className="mt-6 space-y-3">
            {modules.map((module) => (
              <a
                key={module.key}
                href={`#${module.key.toLowerCase()}`}
                className="block rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-blue-300/30 hover:bg-blue-500/10"
              >
                <h2 className="text-sm font-semibold text-white">
                  {module.title}
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {module.subtitle}
                </p>
              </a>
            ))}
          </div>
        </aside>

        <section className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-2xl shadow-blue-950/20">
          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black">
            <iframe
              className="aspect-video w-full"
              src="https://www.youtube.com/embed/dQw4w9WgXcQ"
              title="RAPID4GRAD Course Preview"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_16rem]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-200">
                Current Lesson
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Meeting 前，先知道教授會怎麼問
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                本單元示範如何把研究階段、Meeting 情境、核心痛點與教授偏好轉成一組可貼到外部 AI 的學術指令。
                影片目前使用 YouTube Unlisted iframe 佔位，正式課程可替換為實際影片 ID。
              </p>
            </div>

            <div className="rounded-2xl border border-blue-300/20 bg-blue-500/10 p-4">
              <h3 className="font-semibold text-blue-50">教材下載</h3>
              <div className="mt-4 space-y-2">
                <a
                  href="/guide"
                  className="block rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-blue-100 transition hover:bg-white/[0.08]"
                >
                  研究生畢業避坑指南
                </a>
                <a
                  href="/dashboard/ai-command"
                  className="block rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-blue-100 transition hover:bg-white/[0.08]"
                >
                  AI 指令產生器
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4">
            {modules.map((module) => (
              <section
                key={module.key}
                id={module.key.toLowerCase()}
                className="scroll-mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5"
              >
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-xl font-semibold">{module.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {module.subtitle}
                    </p>
                  </div>
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
                    {module.lessons.length} lessons
                  </span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {module.lessons.map((lesson) => (
                    <button
                      key={lesson}
                      type="button"
                      className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-left text-sm text-slate-300"
                    >
                      {lesson}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
