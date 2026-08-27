# RAPID4GRAD AI Research Prompt Pack V3

## 定位

V3 的免費研究工具對外稱為 **RAPID Research Copilot**。它不是平台內的 PDF 上傳或 LLM 服務，而是由瀏覽器本地組合研究 Prompt，讓研究生把自己的材料自行交給 ChatGPT、Claude、Gemini 或 Grok。

## 主流程

`/ai-command` 預設選擇 Meeting。使用者可只點擊「產生 4 大 AI 研究任務包」一次完成生成；其他任務為先選任務、再生成。主畫面只顯示 Meeting、口試、投稿、論文、簡報五個任務與一句話情境輸入。

材料、研究階段、核心關注與教授偏好放在預設收合的 Advanced 區塊。研究階段預設未指定，未指定時不得寫入生成的 Prompt。教授偏好保留六個快速選項、教授常問問題與其他補充兩個文字區。

## Prompt Pack

每次生成一次使用額度，結果包含四個平台各五段獨立 Prompt：`understand`、`audit`、`challenge`、`improve`、`finish`，共 20 段；另有每個平台的 setup prompt。複製單段、複製全部、切換平台與開啟外部平台都不再次扣額度。

每段 Prompt 都自帶研究任務、材料、情境、關注點、教授偏好、步驟目的、輸出格式與共同證據規則，不依賴使用者必須先貼另一段 Prompt。所有輸出要求繁體中文、保留必要學術英文、區分事實與推論、指出證據位置與資訊缺口，不得捏造研究資料。

平台差異如下：ChatGPT 使用結構化 Markdown 與清單；Claude 使用 evidence-first 與 XML-like 區段；Gemini 使用檔案地圖與文字/圖表/視覺交叉檢查；Grok 使用 A/B/C/D/E 反方壓力測試分類。

## 使用額度與隱私

第一次未登入可直接使用；匿名瀏覽器額度仍由既有 HttpOnly cookie 與 `/api/ai-usage` 管控，目前為 20 次。第 21 次進入既有 Email 驗證流程；Email 驗證或 Google 登入後不限次。Admin Preview 不扣額度。

一次生成只向既有 usage API 傳送相容的短摘要，不傳送完整 Prompt 或使用者情境；情境只存在當次 React state。V3 不呼叫任何 OpenAI、Anthropic、Google 或 xAI API，也不把 PDF 上傳到 RAPID。

## 舊 CMS 相容性

既有 `prompt_templates`、Admin CMS、`buildPrompt()` 與本地 fallback 保留給舊流程與相容性。V3 的主要 Prompt Pack 使用程式碼定義的平台專用模板，不讀取舊 `target_ai=all` CMS 模板，也不修改既有 CMS schema。

## 驗收

需驗證預設 Meeting、一鍵生成、四平台五步驟、單段/全部複製、setup prompt、平台連結、Advanced 收合、20 次匿名額度與 Email 驗證 gate。Production 外部服務設定不屬於此 Prompt Pack 的本地生成邏輯。
