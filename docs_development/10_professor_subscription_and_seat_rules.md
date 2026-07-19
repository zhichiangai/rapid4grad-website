# RAPID4GRAD — Professor Subscription And Seat Rules

> 狀態：Professor Lab 訂閱、席位與角色管理現行規格
> 價格、額度及部分營運規則尚未定案時，一律標記待定，不得由 AI 自行假設。

## 1. Professor Lab 方案

| Plan key | Active student seats | 價格 | PDF 額度 |
|---|---:|---:|---:|
| `professor_lab_standard` | 0–15 | 待定 | 待定 |
| `professor_lab_plus` | 0–30 | 待定 | 待定 |
| `professor_lab_enterprise` | 31+ | 人工洽談 | 人工洽談 |

Professor 與 assistant 不計入 student seats。只有 `status = active` 且 `role = student` 的 membership 計入席位。每個 Lab 最多 3 位 active assistants。

Subscription 由 Professor 帳號付款並綁定該 Professor 自己建立的 Lab。每位 Professor 同時最多擁有一個 active Lab，每個 Lab 同時只能有一筆有效 subscription。Subscription 與 Lab owner 不轉移；新 Professor 必須重新訂閱並建立新的 Lab。

Standard 與 Plus 均支援月繳、年繳。每個 Professor 帳號可領取一次 30 天免綁卡試用；試用不建立綠界 0 元訂單，正式續用時才導向綠界定期定額。價格尚未公告前，系統不得建立正式 checkout。

## 2. 席位規則

- 建立邀請碼前與學生加入時都必須檢查方案席位。
- 第 15 位 active student 可加入 Standard；第 16 位不可先加入。
- 第 16 位嘗試加入時不得建立 membership，系統顯示方案已滿並通知 Professor 先升級 Plus。
- 已付費 Standard 可自助立即升級 Plus：後端先透過綠界終止舊 Standard 未來扣款，再建立完整 Plus 費用付款；verified webhook 確認付款成功後 Plus 立即生效，第 16 位學生才可重新加入。
- Plus 第 30 位可加入；第 31 位不可加入，改為聯絡 RAPID 洽談 Enterprise。
- 移除、退出或停用學生後，席位可重新釋放。
- 每位 student 同一時間只能加入一個 active Lab；離開或被移除後才能加入另一個 Lab。
- 學生轉換 Lab 時，舊 membership 必須先設為 `inactive`、`left` 或 `removed`，才能以原子操作建立另一筆 active membership。
- Professor/assistant 不得透過前端修改訂閱方案或偽造席位數。
- 席位最後名額必須使用資料庫原子操作，避免並行超賣。

## 3. Lab 角色與權限

| Lab role | 成員管理 | 邀請碼 | 查看摘要 | PDF 原檔 | 訂閱管理 | 課程買斷管理 |
|---|---:|---:|---:|---:|---:|---:|
| `owner` | 全部 | 建立／撤銷 | 有 consent 才可 | 不可 | 可以 | 不可 |
| `professor` | 唯讀 | 不可 | 有 consent 才可 | 不可 | 不可 | 不可 |
| `assistant` | 限定 | 預設不可 | 有 consent 且 active 才可 | 不可 | 不可 | 不可 |
| `student` | 不可 | 使用邀請加入 | 只看自己 | 只看自己 | 不可 | 只能購買自己的方案 |

第一版不提供 owner 委派管理權：non-owner professor 與 assistant 僅能查看同 Lab 的必要成員資料與 consent summary，不可建立／撤銷邀請碼、移除成員或修改角色。

### 3.1 Lab 成員移除規則

- Lab owner 可移除自己 Lab 內的 student、assistant 與非 owner professor。
- 非 owner professor 是否可移除成員預設為否；未來若開放，必須由 owner 明確授權。
- Assistant 不可移除任何成員。
- Owner 不可在一般成員管理流程中移除自己，也不可把 owner 身分轉交他人。
- 「移除」只將 membership 改為 `removed` 或其他非 active 狀態，不直接刪除使用者帳號、membership 歷史、私人文件或稽核紀錄。
- 被移除成員立即失去該 Lab 的 `lab_basic`、Professor workspace、PDF shared pool 與新稽核資格。
- 被移除學生的個人 `course_full`、private PDF 與完整歷史稽核結果仍歸學生本人。
- 被移除後，該學生分享給舊 Lab 的 summary consent 必須立即撤回或失效，Professor/assistant 下一次查詢不得再看見摘要。
- 移除操作必須記錄 actor、target、Lab、原因、時間及 membership 前後狀態，並寫入 service-only `lab_membership_action_logs`。

## 4. Professor Dashboard

有效教授訂閱可以使用：

- Lab 基本資料與方案狀態。
- 成員名單、角色、active/inactive 狀態。
- 邀請碼建立、到期、使用上限與撤銷。
- 學生明確同意分享的 AI audit summary。
- 研究進度、風險與下一步的安全摘要。
- Lab 影片內容入口與推薦；不顯示任何個別學生觀看或完成狀態。
- Professor 與 assistant 可觀看教授管理與團隊版本的 `lab_basic` 影片，但不自動取得學生完整課程。
- Professor、assistant 與 student 共用 `/learn` 播放器；可見 lesson 由 active membership、subscription 與個人 entitlement 的 RLS 動態決定，不因進入 Professor workspace 而放寬。

不得提供：

- 學生 private PDF 或 Storage URL。
- 未取得 consent 的完整 AI audit。
- 學生付款資料或個人買斷 entitlement 修改權。
- 跨 Lab 學生資料。
- 學生影片完成狀態、觀看時間、重播次數或其他觀看行為。

「學生進度」只包含學生主動填寫的研究階段、下一步任務，以及明確 consent 的 AI 稽核安全摘要，不包含其他私人研究內容。

## 5. 訂閱生命週期

| Subscription status | Dashboard | Lab basic videos | PDF AI audit | 歷史摘要 |
|---|---|---|---|---|
| `active` / `trialing` | 可操作 | 可看 | 可用 | 依 consent |
| `past_due`（15 天內） | 可操作 | 可看 | 可用 | 依 consent |
| `past_due`（超過 15 天） | 唯讀 | 停止 | 停止新稽核 | 唯讀 |
| `unpaid` / `canceled` | 唯讀 | 停止 | 停止 | 唯讀 |
| `cancel_at_period_end` | 到期前維持 | 到期前維持 | 到期前維持 | 到期後唯讀 |

## 6. 已確認付款規則

- Recurring provider 暫定綠界 ECPay。
- 月繳以每月固定金額處理；年繳以每年固定金額處理。
- 綠界定期定額只提供補授權與終止 API，沒有原地改價／換方案 API。Standard 升級 Plus 採受控的「終止舊排程後建立新排程」流程：先停止 Standard 未來扣款，再立即收取完整 Plus 費用；Plus 付款成功後立即生效，Standard 剩餘天數不折抵。
- Plus 首次付款失敗時不得切換方案，既有 Standard 只維持至原已付款週期結束且不再續扣。舊 Standard 延遲 webhook 必須被辨識為 retired provider order，不能覆蓋 Plus 或重複付款。
- Standard 升級 Plus 時可在新 Plus 訂單選擇月繳或年繳。Plus 降級 Standard，以及不伴隨方案升級的單純月繳／年繳週期切換，第一版仍採客服受控處理，不可直接建立第二筆定期扣款。
- 綠界定期定額執行次數有 provider 上限，系統應在接近上限前建立新的續訂流程，不把有限期數描述成永久自動扣款。
- `past_due` 自付款失敗事件起有 15 天功能寬限；較新的成功付款可恢復 active。
- `unpaid`、`canceled` 立即停止衍生功能並保留唯讀歷史。
- 同秒事件由較嚴格狀態優先，較舊事件不可覆蓋較新狀態；provider event 重送不可重複建立付款。
- PDF 額度數字仍待定，Task 5 不建立任何假 `lab_usage_credits` row。
- 歷史摘要與 Lab 資料最終保留期限；目前先無限期唯讀保留。

## 7. 待決策清單

- Standard/Plus 月繳與年繳價格。
- 各方案 PDF 額度及超額費。
- 各方案免費試用後的轉換文案與提醒節奏。
- Plus 降級 Standard、同方案月繳／年繳切換的客服操作流程與對帳規則。

## 8. Admin 異常處理邊界

- Admin 可查看所有 Lab 的方案、subscription sync 與 active student seats，用於營運與客服。
- Admin 可修正付款已完成但 subscription 未同步的異常，或建立有期限且有理由的客服延長。
- Admin 不可直接修改席位計數器；席位必須由 active student memberships 計算。
- Admin 不可假扮 Professor 管理研究內容，也不能繞過學生 consent 讀取 private PDF 或 raw audit。
- 所有訂閱、membership 與 PDF credit 修正都必須記錄於 `admin_action_logs`。
- 詳細規則見 `12_admin_control_plane_v2.md`。
