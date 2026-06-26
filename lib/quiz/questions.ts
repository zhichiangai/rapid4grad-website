export type QuizOptionValue = "A" | "B" | "C" | "D";

export interface QuizOption {
  value: QuizOptionValue;
  label: string;
}

export interface QuizQuestion {
  id: `q${number}`;
  question: string;
  options: QuizOption[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    question: "你目前的學位與年級是？",
    options: [
      {
        value: "A",
        label: "碩一新進菜鳥 (剛進實驗室/還在適應與修課)",
      },
      {
        value: "B",
        label: "碩二老鳥 (準備畢業衝刺)",
      },
      {
        value: "C",
        label: "碩三以上水深火熱 (延畢邊緣)",
      },
      {
        value: "D",
        label: "博士班 / 在職專班",
      },
    ],
  },
  {
    id: "q2",
    question: "你目前的論文進度是？",
    options: [
      {
        value: "A",
        label: "題目完全沒有方向",
      },
      {
        value: "B",
        label: "正在看文獻、找研究缺口 (Gap)",
      },
      {
        value: "C",
        label: "實驗跑數據 / 寫程式中",
      },
      {
        value: "D",
        label: "論文撰寫中 / 修改初稿",
      },
    ],
  },
  {
    id: "q3",
    question: "你平常閱讀英文文獻的狀態是？",
    options: [
      {
        value: "A",
        label: "能用自己的話說出論文動機、方法與核心 Gap",
      },
      {
        value: "B",
        label: "覺得懂了，但被問到「與前人研究差異」就答不出",
      },
      {
        value: "C",
        label: "主要是翻譯，轉頭就忘，不知道對自己有何幫助",
      },
    ],
  },
  {
    id: "q4",
    question: "你跟指導教授討論 (Meeting) 的狀態是？",
    options: [
      {
        value: "A",
        label: "每週固定討論，進度在掌控中",
      },
      {
        value: "B",
        label: "相敬如賓，沒事不找老師，找老師多半是壞消息",
      },
      {
        value: "C",
        label: "每次開會都壓力很大，常被質疑進度或邏輯不夠清楚",
      },
    ],
  },
  {
    id: "q5",
    question: "你在組會或研討會報告簡報時的狀況是？",
    options: [
      {
        value: "A",
        label: "聽眾專注，架構清楚，能有說服力地傳達價值",
      },
      {
        value: "B",
        label: "投影片字多邏輯亂，台下容易失去注意力，自己口條不順",
      },
      {
        value: "C",
        label: "報告中常被打斷質疑，或因錯字、排版、邏輯被提醒",
      },
    ],
  },
  {
    id: "q6",
    question: "你對文獻管理與 AI 輔助撰寫工具的熟悉度是？",
    options: [
      {
        value: "A",
        label: "熟練使用 Zotero/EndNote，且有學術 Prompt 修改論文",
      },
      {
        value: "B",
        label: "聽過這些工具，但目前多半還是手動調整、大白話問 AI",
      },
      {
        value: "C",
        label: "完全不知道這些工具，排版跟參考文獻常常弄得很混亂",
      },
    ],
  },
  {
    id: "q7",
    question: "你目前的專注時間與焦慮狀態是？",
    options: [
      {
        value: "A",
        label: "時間分配穩定，進度大致在掌控中",
      },
      {
        value: "B",
        label: "偶爾焦慮或失眠，研究時間常被雜事或外務打斷",
      },
      {
        value: "C",
        label: "壓力已經明顯影響作息，常覺得研究進度失控",
      },
    ],
  },
];
