import type { Metadata } from "next";
import {
  DemoStudent,
  StudentListTable,
} from "@/components/professor/StudentListTable";

export const metadata: Metadata = {
  title: "Professor Demo | RAPID4GRAD",
  description:
    "Hidden demo for RAPID4GRAD Research Progress Management professor dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

const students: DemoStudent[] = [
  {
    id: "demo-ming",
    name: "碩二小明",
    degreeYear: "M2 碩二",
    researchStage: "組會簡報衝刺",
    risk: "high",
    painPoints: ["簡報失焦", "研究價值不清", "教授追問壓力"],
    lastUpdatedAt: "2026-06-24 21:10",
    nextStep: "重排簡報故事線，先補研究貢獻頁",
    quizAnswers: [
      { question: "Q1 學位年級", answer: "碩二老鳥，準備畢業衝刺。" },
      { question: "Q2 論文進度", answer: "實驗跑數據中，還沒形成穩定論述。" },
      { question: "Q3 文獻閱讀", answer: "能讀懂單篇，但說不清與前人差異。" },
      { question: "Q4 Meeting 狀態", answer: "每次 Meeting 都容易被質疑沒有主線。" },
      { question: "Q5 簡報狀態", answer: "投影片字多、邏輯亂，常被中途打斷。" },
      { question: "Q6 工具熟悉度", answer: "AI 與文獻管理工具都聽過，但工作流不穩。" },
      { question: "Q7 壓力狀態", answer: "容易失眠，研究時間常被雜事切碎。" },
    ],
    meetingNotes: [
      {
        date: "2026-06-18",
        summary:
          "教授要求小明先回答「這份實驗到底解決哪一個 gap」，不要先堆結果圖。",
      },
      {
        date: "2026-06-24",
        summary:
          "組會中第 7 頁被打斷，原因是圖表結論與研究問題沒有直接連接。",
      },
    ],
    weeklyUpdates: [
      "已完成三組初步數據，但摘要仍偏向實驗紀錄，不像研究論證。",
      "下週需要先產出 5 頁精簡版簡報，聚焦研究動機、方法、初步結果、限制。",
    ],
    nextTasks: [
      "用 RAPID Presentation 模板重排簡報前 5 頁。",
      "Meeting 前產生教授追問版 AI 指令，先模擬 8 題質疑。",
      "把所有圖表補上「這張圖證明什麼」的一句話 caption。",
    ],
    recommendationDraft:
      "It is my pleasure to recommend Ming, a graduate student who has demonstrated persistence in refining his research presentation and strengthening the logical framing of his thesis work. His recent progress shows a clear ability to respond to feedback, identify weaknesses in communication, and translate experimental results into a more coherent research narrative.",
  },
  {
    id: "demo-hua",
    name: "碩一小華",
    degreeYear: "M1 碩一",
    researchStage: "文獻與題目探索",
    risk: "low",
    painPoints: ["文獻整理", "題目收斂"],
    lastUpdatedAt: "2026-06-23 18:35",
    nextStep: "把 12 篇文獻整理成 3 個可能 gap",
    quizAnswers: [
      { question: "Q1 學位年級", answer: "碩一新生。" },
      { question: "Q2 論文進度", answer: "正在看文獻、找研究缺口。" },
      { question: "Q3 文獻閱讀", answer: "能用自己的話說出論文動機、方法與核心 gap。" },
      { question: "Q4 Meeting 狀態", answer: "每週固定討論，進度在掌控中。" },
      { question: "Q5 簡報狀態", answer: "架構大致清楚，但仍需要更精簡。" },
      { question: "Q6 工具熟悉度", answer: "已開始使用 Zotero 與 AI 摘要輔助。" },
      { question: "Q7 壓力狀態", answer: "時間分配穩定，壓力可控。" },
    ],
    meetingNotes: [
      {
        date: "2026-06-16",
        summary:
          "教授建議小華不要太早決定方法，先把三個研究方向的可行性比較清楚。",
      },
      {
        date: "2026-06-23",
        summary: "小華能清楚說明每篇文獻的研究問題，教授評估進度正常。",
      },
    ],
    weeklyUpdates: [
      "本週新增 4 篇核心文獻，已完成摘要與方法分類。",
      "下週準備用一頁表格比較三個題目方向。",
    ],
    nextTasks: [
      "建立文獻比較矩陣。",
      "用 Research 模板找出每個方向的 potential gap。",
      "下次 Meeting 前準備 3 個可被驗證的研究問題。",
    ],
    recommendationDraft:
      "Hua is a promising first-year graduate student with strong discipline in literature review and research organization. She consistently prepares for meetings with clear questions and demonstrates maturity in connecting prior work to possible research directions.",
  },
  {
    id: "demo-yichun",
    name: "博三怡君",
    degreeYear: "PhD 3",
    researchStage: "投稿前 manuscript 修訂",
    risk: "medium",
    painPoints: ["投稿邏輯", "limitation", "貢獻 framing"],
    lastUpdatedAt: "2026-06-22 15:50",
    nextStep: "補強 limitation 與 contribution paragraph",
    quizAnswers: [
      { question: "Q1 學位年級", answer: "博士班。" },
      { question: "Q2 論文進度", answer: "論文撰寫中，已有 manuscript draft。" },
      { question: "Q3 文獻閱讀", answer: "能說出與前人研究差異，但 contribution 還可更聚焦。" },
      { question: "Q4 Meeting 狀態", answer: "固定討論，但投稿前問題變多。" },
      { question: "Q5 簡報狀態", answer: "簡報清楚，主要問題在 manuscript 論證。" },
      { question: "Q6 工具熟悉度", answer: "熟悉 Zotero 與 AI 英文修飾。" },
      { question: "Q7 壓力狀態", answer: "中度焦慮，擔心 reviewer 質疑 novelty。" },
    ],
    meetingNotes: [
      {
        date: "2026-06-12",
        summary:
          "教授要求補強 why now / why this method，不要只說實驗結果優於 baseline。",
      },
      {
        date: "2026-06-22",
        summary:
          "目前 draft 可投稿，但 limitation 段落過短，需預先回應 reviewer 可能質疑。",
      },
    ],
    weeklyUpdates: [
      "完成 introduction 第二版，貢獻點從 5 個壓縮成 3 個。",
      "結果章節新增 ablation study，但 discussion 還未連回研究問題。",
    ],
    nextTasks: [
      "用 logic_check 指令檢查 introduction 到 conclusion 的論證鏈。",
      "補一段 limitation 與 future work。",
      "準備 reviewer 可能提出的 10 個 novelty 質疑。",
    ],
    recommendationDraft:
      "Yi-Chun has shown strong independence in developing a publishable research manuscript. Her work reflects careful methodological execution, and with further refinement of contribution framing, she is well-positioned to make a meaningful scholarly contribution.",
  },
  {
    id: "demo-che",
    name: "碩三阿哲",
    degreeYear: "M3+ 碩三以上",
    researchStage: "題目重整與畢業路線確認",
    risk: "high",
    painPoints: ["題目不穩", "Meeting 壓力", "畢業路線不明"],
    lastUpdatedAt: "2026-06-21 23:20",
    nextStep: "先定義最低可畢業版本，不再擴題",
    quizAnswers: [
      { question: "Q1 學位年級", answer: "碩三以上，延畢邊緣。" },
      { question: "Q2 論文進度", answer: "題目仍沒有穩定方向。" },
      { question: "Q3 文獻閱讀", answer: "讀過很多，但不知道如何用到自己的題目。" },
      { question: "Q4 Meeting 狀態", answer: "被教授電爆，常被質疑沒有進度。" },
      { question: "Q5 簡報狀態", answer: "報告會被打斷，研究問題說不清。" },
      { question: "Q6 工具熟悉度", answer: "工具流混亂，參考文獻與版本管理不穩。" },
      { question: "Q7 壓力狀態", answer: "高度焦慮，曾出現休學念頭。" },
    ],
    meetingNotes: [
      {
        date: "2026-06-10",
        summary:
          "教授明確要求阿哲停止新增題目，改用現有材料整理成可畢業版本。",
      },
      {
        date: "2026-06-21",
        summary:
          "Meeting 後決定用兩週時間整理最小研究問題與可交付章節大綱。",
      },
    ],
    weeklyUpdates: [
      "本週刪除兩個過度發散的支線題目。",
      "仍需要把現有數據整理成一條可答辯的主線。",
    ],
    nextTasks: [
      "列出最低畢業版本：研究問題、方法、結果、限制。",
      "下一次 Meeting 只報告一條主線，不新增支線。",
      "用 advisor_questions 指令預演教授對畢業可行性的追問。",
    ],
    recommendationDraft:
      "Che has demonstrated resilience through several research direction changes and continues to engage seriously with advisor feedback. His ability to persist under uncertainty and gradually narrow his research scope reflects qualities valuable in challenging academic environments.",
  },
  {
    id: "demo-an",
    name: "在職專班小安",
    degreeYear: "Part-time 在職專班",
    researchStage: "工具流與每週產出節奏建立",
    risk: "medium",
    painPoints: ["時間分配", "工具落差", "寫作節奏"],
    lastUpdatedAt: "2026-06-20 20:05",
    nextStep: "建立每週 2 小時固定研究輸出節奏",
    quizAnswers: [
      { question: "Q1 學位年級", answer: "在職專班。" },
      { question: "Q2 論文進度", answer: "已有實務問題，正在整理研究架構。" },
      { question: "Q3 文獻閱讀", answer: "能理解主題，但缺少系統整理。" },
      { question: "Q4 Meeting 狀態", answer: "不固定，通常累積問題後才找老師。" },
      { question: "Q5 簡報狀態", answer: "內容實務性強，但學術化不足。" },
      { question: "Q6 工具熟悉度", answer: "文獻管理與 AI prompt 都還不熟。" },
      { question: "Q7 壓力狀態", answer: "工作干擾多，研究時間容易被佔據。" },
    ],
    meetingNotes: [
      {
        date: "2026-06-13",
        summary:
          "教授建議小安先把實務問題翻成研究問題，不要直接寫成工作報告。",
      },
      {
        date: "2026-06-20",
        summary:
          "本週確認研究對象與初步訪談方向，但需要建立文獻管理工作流。",
      },
    ],
    weeklyUpdates: [
      "完成 3 位可能訪談對象名單。",
      "尚未建立固定文獻筆記格式，進度容易斷裂。",
    ],
    nextTasks: [
      "建立 Zotero collection 與 10 篇核心文獻清單。",
      "每週固定產出 300 字研究筆記。",
      "用 Application 模板把工作問題轉成研究問題。",
    ],
    recommendationDraft:
      "An brings valuable professional experience into graduate research and has shown the ability to connect practical problems with academic inquiry. With improved workflow management, An has strong potential to complete a focused and impactful thesis project.",
  },
];

export default function ProfessorDemoPage() {
  const highRiskCount = students.filter(
    (student) => student.risk === "high",
  ).length;
  const mediumRiskCount = students.filter(
    (student) => student.risk === "medium",
  ).length;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.24),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 py-10 text-white">
      <section className="mx-auto w-full max-w-7xl">
        <header className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-7 shadow-2xl shadow-blue-950/30">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">
            Hidden Professor Demo
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            實驗室健康度看板
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
            這是隱藏入口的 Professor Dashboard demo，用於展示未來
            Research Progress Management System 的商業價值：教授可以快速看到學生風險、卡點、最近更新、下一步任務與推薦信草稿。
          </p>
          <p className="mt-3 text-xs leading-5 text-slate-600">
            Demo only：使用前端 mock data，不讀取真實學生資料，不呼叫 AI API。
          </p>
        </header>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            ["學生數", students.length.toString()],
            ["高風險", highRiskCount.toString()],
            ["中風險", mediumRiskCount.toString()],
            ["本週焦點", "Meeting / 簡報 / 投稿"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
            >
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                {label}
              </p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <StudentListTable students={students} />
        </div>
      </section>
    </main>
  );
}
