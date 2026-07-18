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

## 2. 席位規則

- 建立邀請碼前與學生加入時都必須檢查方案席位。
- 第 15 位 active student 可加入 Standard；第 16 位不可先加入。
- 第 16 位嘗試加入時不得建立 membership，系統顯示方案已滿並通知 Professor 先升級 Plus。
- Professor 完成 Plus 升級後，學生才可重新加入。
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
| `professor` | 依 owner 授權 | 可選擇開放 | 有 consent 才可 | 不可 | 不可或待授權 | 不可 |
| `assistant` | 限定 | 預設不可 | 有 consent 且 active 才可 | 不可 | 不可 | 不可 |
| `student` | 不可 | 使用邀請加入 | 只看自己 | 只看自己 | 不可 | 只能購買自己的方案 |

是否允許非 owner professor 管理邀請碼與成員仍待產品決策；未確認前採最小權限。

### 3.1 Lab 成員移除規則

- Lab owner 可移除自己 Lab 內的 student、assistant 與非 owner professor。
- 非 owner professor 是否可移除成員預設為否；未來若開放，必須由 owner 明確授權。
- Assistant 不可移除任何成員。
- Owner 不可在一般成員管理流程中移除自己，也不可把 owner 身分轉交他人。
- 「移除」只將 membership 改為 `removed` 或其他非 active 狀態，不直接刪除使用者帳號、membership 歷史、私人文件或稽核紀錄。
- 被移除成員立即失去該 Lab 的 `lab_basic`、Professor workspace、PDF shared pool 與新稽核資格。
- 被移除學生的個人 `course_full`、private PDF 與完整歷史稽核結果仍歸學生本人。
- 被移除後，該學生分享給舊 Lab 的 summary consent 必須立即撤回或失效，Professor/assistant 下一次查詢不得再看見摘要。
- 移除操作必須記錄 actor、target、Lab、原因、時間及 membership 前後狀態。

## 4. Professor Dashboard

有效教授訂閱可以使用：

- Lab 基本資料與方案狀態。
- 成員名單、角色、active/inactive 狀態。
- 邀請碼建立、到期、使用上限與撤銷。
- 學生明確同意分享的 AI audit summary。
- 研究進度、風險與下一步的安全摘要。
- Lab 影片內容入口與推薦；不顯示任何個別學生觀看或完成狀態。
- Professor 與 assistant 可觀看教授管理與團隊版本的 `lab_basic` 影片，但不自動取得學生完整課程。

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
| `past_due` | 唯讀 | 停止 | 停止新稽核 | 唯讀 |
| `unpaid` / `canceled` | 唯讀 | 停止 | 停止 | 唯讀 |
| `cancel_at_period_end` | 到期前維持 | 到期前維持 | 到期前維持 | 到期後唯讀 |

## 6. 待決策清單

- Small/Large 價格及月繳、年繳方式。
- 各方案 PDF 額度及超額費。
- 非 owner professor 的管理能力。
- Past due 是否提供付款寬限天數。
- 歷史摘要與 Lab 資料最終保留期限；目前先無限期唯讀保留。

## 7. Admin 異常處理邊界

- Admin 可查看所有 Lab 的方案、subscription sync 與 active student seats，用於營運與客服。
- Admin 可修正付款已完成但 subscription 未同步的異常，或建立有期限且有理由的客服延長。
- Admin 不可直接修改席位計數器；席位必須由 active student memberships 計算。
- Admin 不可假扮 Professor 管理研究內容，也不能繞過學生 consent 讀取 private PDF 或 raw audit。
- 所有訂閱、membership 與 PDF credit 修正都必須記錄於 `admin_action_logs`。
- 詳細規則見 `12_admin_control_plane_v2.md`。
