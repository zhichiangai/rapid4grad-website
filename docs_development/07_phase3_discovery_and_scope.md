# RAPID4GRAD — Phase 3 Discovery And Scope

更新時間：2026-07-11 CST

本文件只定義 Phase 3 候選能力、前置驗收與非目標，不授權新增 schema 或實作功能。Phase 2 remote migrations、Preview E2E、Stripe Test Mode 與真實 AI provider 驗收完成前，不開始 Phase 3 MVP。

## 1. 已完成的 Phase 2 本機能力

- Student / professor / admin workspace 與 OAuth safe redirect。
- Private PDF upload、真實檔案驗證與 AI audit streaming 架構。
- AI audit reserve / settle / refund 額度生命週期。
- Student audit history 與 graceful error UI。
- Professor Lab、invite create/revoke 與 student atomic join。
- Stripe subscription checkout、portal、webhook ordering 與兩階段 idempotency。
- Profiles、free quota、Email verification session 與多租戶 RLS 安全修補。
- Phase 1 prompt builder、舊 course access 與 hidden professor demo fallback。

## 2. Phase 2 待人工驗收

- 依 migration 順序套用尚未進 remote 的 migrations，逐項執行驗收 SQL。
- Preview 驗證 student owner、same-lab professor、cross-lab professor 與 admin observation RLS。
- Preview 驗證 private PDF upload、stream complete/error/abort、history persistence 與 quota refund。
- Stripe Test Mode 驗證 checkout、portal、signature、resend、payment_failed、cancel 與 deleted。
- 設定並驗證 server-only AI Gateway/provider credential，不得傳入 client bundle。
- Resend 驗證 cooldown、錯誤 PIN 上限與 HttpOnly verified session。

## 3. 候選能力評估

### 3.1 多 Workspace / 多組織權限模型

- 使用者問題：同一使用者未來可能同時是學生、助教、教授或多個 Lab 成員，單一 `profiles.role` 無法表達作用域。
- 目標角色：student、assistant、professor、admin。
- 最小 MVP：先產出角色、workspace、scope 與切換規則 ADR；以 `user_workspace_roles` 作概念候選，不建立 table。
- 不做範圍：複雜 organization hierarchy、跨校聯盟、細粒度自訂 permission builder。
- Schema：未決策；需 ADR 與 RLS threat model 後才能新增。
- Phase 2 依賴：需先通過現有 workspace redirect 與 Lab isolation E2E。
- 主要風險：身份混淆、跨租戶越權、JWT claim 過期、管理介面誤授權。
- 成本：高。
- 優先順序：P2，只有出現真實多身份需求才啟動。

### 3.2 學生文件分享 Consent

- 使用者問題：教授需要查看指定文件，但學生必須知道分享對象、時間與可撤回狀態。
- 目標角色：student、professor、assistant。
- 最小 MVP：學生逐文件選擇指定 Lab 分享；記錄 consent time、revoked time；撤回後立即阻止新讀取。
- 不做範圍：公開分享連結、匿名下載、跨 Lab 批次分享、永久 URL。
- Schema：需要獨立 document sharing/consent record，不沿用模糊的 `lab_id` 作永久同意。
- Phase 2 依賴：private Storage、document owner RLS、Lab membership 與 audit history 必須先驗收。
- 主要風險：撤回後快取或既有 signed URL 尚有效、教授離開 Lab 後仍可見。
- 成本：中。
- 優先順序：P0，是正式教授讀取 PDF 本文前置條件。

### 3.3 AI Research Navigator

- 使用者問題：學生知道稽核問題但不知道下一週應採取什麼研究行動。
- 目標角色：student。
- 最小 MVP：依最近一次 audit summary、issue tags 與學生選擇，產生三項可確認的下一步；每項保留來源 audit id。
- 不做範圍：自主執行研究、代理人群、自動改論文、自訓模型、取代教授決策。
- Schema：可能需要 lightweight action plan 與 completion state；先以 UX prototype 驗證需求。
- Phase 2 依賴：audit persistence、quota/cost、provider reliability 與 fallback 必須先驗收。
- 主要風險：建議幻覺、過度依賴、成本累積與學術責任界線。
- 成本：中。
- 優先順序：P1。

### 3.4 Professor Lab Workflow

- 使用者問題：教授能看 summary，但缺乏可追蹤的下一步、提醒與週進度節奏。
- 目標角色：professor、assistant、student。
- 最小 MVP：教授建立一項學生任務、到期日與狀態；週摘要只彙整已授權資料。
- 不做範圍：完整 LMS、成績系統、排課、即時協作編輯器、完整 LINE Bot。
- Schema：需要 scoped task 與 activity records；須配合多 workspace ADR。
- Phase 2 依賴：Lab isolation、document consent 與 professor summary E2E。
- 主要風險：通知疲勞、跨 Lab 任務洩漏、admin observation 被誤認為教授操作。
- 成本：中高。
- 優先順序：P1，在 document consent 後。

### 3.5 AI Audit Background Queue / Retry

- 使用者問題：長 PDF 或 provider 暫時失敗時，瀏覽器中斷不應遺失工作或重複扣額度。
- 目標角色：student、營運 admin。
- 最小 MVP：durable queued job、有限次 retry、可觀察 failure reason code、reserve/settle/refund 與 job attempt 綁定。
- 不做範圍：多模型 agent swarm、任意 workflow builder、無上限重試。
- Schema：可能擴充 job attempt / lease 欄位；先選定 Vercel Queue/Workflow 或等價服務再決定。
- Phase 2 依賴：現有 audit job state、原子 quota lifecycle、provider timeout 與 cost logging E2E。
- 主要風險：重複執行、重複成本、卡住 reservation、不同 region worker 競爭。
- 成本：高。
- 優先順序：P0，正式擴大量前完成。

## 4. 近期不做

- 完整 LMS。
- 多模型 agent swarm。
- 自行訓練基礎模型。
- 完整 LINE Bot。
- 即時多人協作編輯器。
- 未完成 ADR 的複雜 organization schema。
- 未取得學生明確 consent 的教授 PDF 本文讀取。

## 5. Phase 3 啟動門檻

只有以下條件全部通過，才可選定一個 Phase 3 MVP：

1. 所有 Phase 2 local migrations 已安全套用 Preview，且 migration history 一致。
2. OAuth/workspace、RLS cross-lab、PDF upload、AI audit、history、Lab invite 與 Stripe Test Mode E2E 通過。
3. Secret exposure 搜尋、lint、typecheck、build 與 unit tests 通過。
4. 文件分享 consent 與 background execution 的 ADR 已決策。
5. 已定義成本上限、失敗恢復、資料保留與人工客服流程。

目前判斷：Phase 3 可進行 discovery 與 UX prototype，但尚不具備安全開始 production MVP 實作的條件。
