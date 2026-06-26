import Link from "next/link";

const chapters = [
  {
    id: "gap",
    title: "避坑 1：不要只讀文獻，要讀出研究缺口",
    body: [
      "很多研究生花最多時間看 paper，卻沒有把文獻整理成可被教授追問的研究缺口。真正有用的閱讀，不是翻譯摘要，而是能說清楚前人做了什麼、還沒解決什麼、你的題目為什麼值得做。",
      "本週行動：挑 3 篇最相關文獻，各寫下研究問題、方法、限制與你可以延伸的 gap。不要超過一頁，重點是能在 Meeting 中講清楚。",
    ],
  },
  {
    id: "topic",
    title: "避坑 2：題目不穩時，不要急著寫很多頁",
    body: [
      "題目還沒穩定時，寫越多只是製造更多之後要重改的內容。教授真正會問的是：這個題目解決什麼問題、為什麼現在要做、你有什麼資料或方法能支持它。",
      "本週行動：用 5 句話寫下題目版本，包含研究對象、核心問題、方法、預期貢獻與可能限制。先拿這 5 句話去測試邏輯，不要先堆文字。",
    ],
  },
  {
    id: "meeting",
    title: "避坑 3：Meeting 前不要只做進度整理，要先模擬追問",
    body: [
      "很多人 Meeting 前只準備自己做了什麼，卻沒有準備教授會怎麼質疑。真正能降低壓力的方法，是先把報告丟進外部 AI，請它用指導教授或口委角度追問邏輯漏洞。",
      "本週行動：每次 Meeting 前至少準備 10 題可能被問的問題，並標記其中 3 題最危險的問題。RAPID 的 AI 指令產生器就是為這件事設計。",
    ],
  },
  {
    id: "slides",
    title: "避坑 4：簡報不是資料堆疊，而是研究故事線",
    body: [
      "投影片字很多，不代表內容完整。教授與同儕需要先理解你的研究問題，再理解方法與結果。若故事線失焦，細節越多越容易被打斷。",
      "本週行動：把簡報拆成問題、方法、結果、限制、下一步五段。每一段只問自己一件事：聽眾看完這段後，應該相信什麼？",
    ],
  },
  {
    id: "tools",
    title: "避坑 5：不要用大白話問 AI，要給它角色、情境與任務",
    body: [
      "AI 的輸出品質取決於你的指令品質。只問「幫我看這份報告」通常會得到泛泛建議；但如果指定角色、學生背景、Meeting 情境、教授偏好與輸出格式，AI 才能更像學術檢查工具。",
      "本週行動：把每次問 AI 的 prompt 固定包含 Role、Context、Task、Output 四段。不要只問答案，要要求 AI 找漏洞。",
    ],
  },
  {
    id: "emotion",
    title: "避坑 6：焦慮不是問題本身，失去下一步才是",
    body: [
      "研究生焦慮常常不是因為真的做不完，而是因為不知道下一步要做什麼。當任務模糊時，大腦會把它放大成整體失控感。",
      "本週行動：把研究任務切成 25 分鐘可完成的小步驟。例如不是「整理文獻」，而是「整理 A 論文的研究問題與限制」。",
    ],
  },
  {
    id: "direction",
    title: "避坑 7：不要等快延畢才建立自己的研究作業系統",
    body: [
      "畢業不是靠某一次爆肝，而是靠穩定的研究作業系統：文獻怎麼讀、Meeting 怎麼準備、簡報怎麼修、AI 怎麼用、教授偏好怎麼累積。",
      "本週行動：建立固定流程。每週至少一次整理文獻、一份 Meeting 前問題清單、一段可展示的進度，以及一個下週要驗證的假設。",
    ],
  },
];

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.24),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] px-4 py-10 text-white">
      <section className="mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-slate-950/75 p-6 shadow-2xl shadow-blue-950/30 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">
          Free Guide
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          研究生畢業避坑指南
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
          這份指南整理 7 個最容易拖慢研究進度的坑。你可以先讀完，再做 7
          題畢業狀態檢查，找出目前最需要處理的卡點。
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/quiz"
            className="inline-flex justify-center rounded-2xl bg-blue-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400"
          >
            做 7 題畢業狀態檢查
          </Link>
          <Link
            href="/course"
            className="inline-flex justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
          >
            查看課程方案
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-8 grid max-w-6xl gap-8 lg:grid-cols-[18rem_1fr]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <nav className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
            <p className="px-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
              Chapters
            </p>
            <div className="mt-3 space-y-1">
              {chapters.map((chapter, index) => (
                <a
                  key={chapter.id}
                  href={`#${chapter.id}`}
                  className="block rounded-xl px-3 py-2 text-sm leading-5 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                >
                  {index + 1}. {chapter.title.replace(/^避坑 \d：/, "")}
                </a>
              ))}
            </div>
          </nav>
        </aside>

        <article className="space-y-5">
          {chapters.map((chapter) => (
            <section
              key={chapter.id}
              id={chapter.id}
              className="scroll-mt-8 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-6"
            >
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                {chapter.title}
              </h2>
              <div className="mt-4 space-y-4 text-base leading-8 text-slate-300">
                {chapter.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}

          <section className="rounded-[2rem] border border-blue-300/20 bg-blue-500/10 p-6">
            <h2 className="text-2xl font-semibold">下一步：把避坑變成行動</h2>
            <p className="mt-3 text-sm leading-7 text-blue-100">
              如果你已經知道自己卡在哪裡，下一步不是繼續焦慮，而是把卡點轉成可檢查、可修正、可跟教授討論的具體問題。
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/quiz"
                className="inline-flex justify-center rounded-2xl bg-blue-500 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-400"
              >
                先做風險檢查
              </Link>
              <Link
                href="/course"
                className="inline-flex justify-center rounded-2xl border border-blue-200/20 bg-white/[0.06] px-6 py-3.5 text-sm font-semibold text-blue-50 transition hover:bg-white/[0.1]"
              >
                看課程與工具包
              </Link>
            </div>
          </section>
        </article>
      </section>
    </main>
  );
}
