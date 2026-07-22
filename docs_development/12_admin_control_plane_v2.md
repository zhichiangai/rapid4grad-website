# RAPID4GRAD — Admin Control Plane V2

> 狀態：V2 Task 8 已完成 Local closure；Preview migration 與 E2E 尚未驗收
> 生效日期：2026-07-22
> 本文件同時定義 Admin 產品規則與目前本機實作邊界，不代表已部署 Production。

## 1. Admin 定位

Admin 是 RAPID4GRAD 內部營運、客服、安全與驗收控制台，不是一般 student、professor 或 Lab member。

- Admin workspace：`/admin`。
- Admin observation 不等於 Professor Lab membership。
- Admin 可進 Professor workspace 驗收與客服觀察，但必須是 read-only observation mode。
- Admin 可處理帳號、付款、entitlement、Lab 訂閱、席位與額度異常。
- Admin 不參與學生研究管理，也不因角色而取得完整課程或 PDF 本文權限。
- 所有高權限操作必須在 server-side 完成並留下稽核紀錄。

## 2. 現有 Legacy Admin

目前已存在的 Phase 1 頁面：

| Route | 現有功能 | V2 處理 |
|---|---|---|
| `/admin` | 三個管理模組入口 | 保留並重整為 V2 總覽 |
| `/admin/leads` | Lead、風險、標籤與跟進狀態 | 保留 |
| `/admin/quotas` | Phase 1 免費 Prompt 額度 | 保留並標示 Legacy |
| `/admin/templates` | Prompt Template CMS | 保留 |

上述 compatibility 頁面已納入 active Admin recheck、必填 reason、二次確認、service-only RPC 與 action log；`/admin/quotas` 仍只屬於 Phase 1 Legacy 額度。

## 3. V2 Admin MVP 路由

| Route | 用途 | 優先級 |
|---|---|---:|
| `/admin/users` | 查詢帳號、workspace role 與帳號狀態 | `IMPLEMENTED` Local closure |
| `/admin/entitlements` | 查詢、補發、撤銷個人課程權限 | `IMPLEMENTED` Local closure |
| `/admin/labs` | 查看 Lab、成員、方案與席位 | `IMPLEMENTED` Local closure |
| `/admin/subscriptions` | 查看 Professor subscription 與同步狀態 | `IMPLEMENTED` Local closure |
| `/admin/orders` | 查看一次性訂單與付款安全摘要 | `IMPLEMENTED` Local closure |
| `/admin/pdf-credits` | 查看及受控補充 Lab PDF 額度 | `IMPLEMENTED` Local closure |
| `/admin/action-logs` | 查看敏感管理操作紀錄安全快照 | `IMPLEMENTED` Local closure |
| `/admin/course-content` | 管理影片存取層級 | 後續 |
| `/admin/audit-consents` | 查看 consent 狀態與異常，不顯示 PDF 本文 | 後續 |

## 4. 使用者與角色管理

Admin 可以：

- 依 Email、姓名或 user ID 搜尋帳號。
- 查看主要 workspace role、帳號狀態及所屬 Lab。
- 經審核啟用 professor workspace。
- 停用濫用或異常帳號，必須填寫原因。
- 修正錯誤角色，必須保存 before/after state。

已確認限制：Admin UI 只允許 `student ↔ professor`，絕不授予、移除或降級 `admin`。Admin 帳號的 role 與 account status 均受資料庫 RPC 保護。

Admin MVP 不提供：

- 直接刪除帳號。
- 模擬登入或 impersonation。
- 不留紀錄的 role 修改。
- 將自己加入任意 Lab 以取得 Professor 權限。

## 5. Entitlement 管理

- 學生完整影片由個人永久 `course_full` entitlement 決定。
- Admin 可因付款同步失敗、退款處理、客服補償或錯誤授權補發／撤銷 entitlement。
- 每次操作必須填寫 reason，並寫入 `admin_action_logs`。
- Professor、assistant 與 Lab owner 不得修改學生個人買斷 entitlement。
- Lab subscription 衍生的 `lab_basic` 與 `pdf_audit_team` 不應手動永久授予個人。

## 6. Professor Subscription 與席位管理

Admin 可以查看：

- `professor_lab_standard`、`professor_lab_plus` 或人工洽談 Enterprise。
- subscription status、起訖時間及付款 provider 同步狀態。
- active student seats、方案上限與超限異常。
- Lab owner、professor、assistant 與 student memberships。

Admin 可以處理：

- 付款已成功但 subscription 未同步的異常。
- 有明確期限與原因的客服延長。
- 錯誤 membership 或席位狀態修正。

Task 8 MVP 只實作 subscription 客服延長：每次 1–30 天，且只接受仍具功能性的 `active`、`trialing`、`past_due`。`incomplete`、`unpaid`、`canceled`、`expired` 不可由此介面復活；方案切換與 membership 異常修正仍沿用既有付款／Professor owner 流程或留待後續受控操作。

Admin 不應直接修改計數器來偽造席位；席位應由 active student memberships 計算。最後席位加入仍需資料庫原子限制。

一般成員管理由 Lab owner 在 Professor Dashboard 執行。Owner 可將自己 Lab 的 student、assistant 或非 owner professor membership 改為 `removed`，但不可刪除使用者帳號或歷史資料。Admin 只處理異常修正，且不得把一般移除流程改成硬刪除。

一般 Professor owner 的移除與 staff role 切換寫入 service-only `lab_membership_action_logs`；Admin 的異常修正才寫入 `admin_action_logs`。兩者都必須保存必要 reason 與 before/after state，但不得保存 private PDF、raw audit、付款明細或影片進度。

Admin 應能辨識 Standard 0–15、Plus 0–30 與 31+ 洽談狀態。第 16／31 位加入失敗時，Admin 可查看原因，但不可繞過方案上限強制建立 active membership。Admin 也應能辨識每位 Professor 一個 active owned Lab、每個 Lab 一筆有效 subscription，以及最多 3 位 active assistants 的違規狀態。

## 7. Lab PDF 額度管理

- PDF AI 稽核額度屬於有效 Professor Lab，不屬於個人課程買斷。
- Standard 預設每月 30 次、Plus 預設每月 100 次，按 subscription 起始日重設且不結轉。Enterprise 或客服例外可由受控 Admin 介面設定 subscription override。
- Admin 可查看 Lab limit、reserved、used、remaining 與週期。
- Admin 可因系統失敗或客服補償設定當期例外額度，每次 1–100，必須填寫原因並留下 action log；只能增加 limit，不得直接改 used/reserved counter。
- Admin 不得透過額度管理取得 PDF 本文或 raw audit。
- Reserve、settle、refund 必須使用原子資料庫操作，Admin UI 不直接改 used counter。
- Shared pool 只供該 Lab active students 使用；Admin、Professor 與 assistant 不直接消耗額度。

## 8. 課程與影片管理

後續 `/admin/course-content` 可管理每個 lesson 的存取層級：

- `public_preview`
- `lab_basic`
- `full_course`

修改影片層級是產品權限異動，必須記錄 before/after state。前台使用 provider-neutral HTML5 網頁播放器；影片檔案或串流來源不得放進 Git repo。正式承載平台與短效簽章策略尚待決定，Admin 只能保存 provider identifier／object key，不應把永久公開 URL 當成安全方案。

## 9. PDF、Audit 與 Consent 安全邊界

Admin 預設不可：

- 讀取學生 private PDF。
- 取得 Storage object 或永久 URL。
- 讀取完整 `result_markdown`、`input_prompt`、token/cost 或 error message。
- 繞過學生 revoke，重新讓 Professor 看見摘要。

Admin 可查看最小營運資訊，例如 job 狀態、匿名化錯誤代碼、額度扣除狀態與 consent 是否有效。若未來需要客服限時存取敏感內容，必須另設期限、目的、審批及完整 audit log，不可內建為一般 Admin 永久權限。

## 10. Admin Action Log

V2 Baseline 已建立 `admin_action_logs`，包含：

| 欄位 | 用途 |
|---|---|
| `id` | 操作紀錄 ID |
| `admin_user_id` | 執行者 |
| `action_type` | 動作類型 |
| `target_type` | user、entitlement、lab、subscription、credit 等 |
| `target_id` | 目標 ID |
| `reason` | 必填操作原因 |
| `before_state` | 操作前安全快照 |
| `after_state` | 操作後安全快照 |
| `request_id` | 追蹤同一次 server request |
| `created_at` | 操作時間 |

Log 不應保存 secret、完整 PDF、raw prompt 或其他不必要敏感內容。一般 client 不可 INSERT、UPDATE 或 DELETE action logs。

## 11. 敏感操作防線

- Admin layout 與每個 Server Action/API 都要獨立驗證 admin role。
- 高權限寫入只用 server-only admin client。
- Client Component 不可直接 UPDATE 權限資料表。
- 補發／撤銷 entitlement、停用帳號、延長 subscription、補 PDF credits 必須填 reason。
- 撤銷 entitlement、停用帳號等破壞性操作需要二次確認。
- 對前端回傳一般化錯誤，不回傳 raw database `error.message`。
- MVP 維持單一 `admin`；`support`、`finance`、`super_admin` 等內部細分角色留待實際團隊需要後再設計。

## 12. 與 Professor 的邊界

| 能力 | Admin | Lab owner/professor |
|---|---:|---:|
| 營運查看所有 Lab 方案狀態 | 是 | 否，只看自己 Lab |
| 管理自己 Lab 成員 | 異常處理 | 是 |
| 修改學生個人買斷 | 受控客服操作 | 否 |
| 查看 consent summary | 最小營運資訊 | 有效 consent 才可 |
| 查看 private PDF/raw audit | 否 | 否 |
| 管理付款同步異常 | 是 | 否 |
| 修改 Prompt Template | 是 | 否 |

Admin 進入 `/professor/dashboard` 或 Lab 詳情時只能查看，不可使用建立邀請碼、修改 membership、指派研究工作或其他 Professor 操作。需要修正營運資料時，必須回到 `/admin` 的受控 action 並留下 log。

## 13. 已確認決策與後續項目

已確認：

- Professor role 目前由 Admin 人工審核修正；付款不自動把 student 改為 professor。
- 客服延長 subscription 每次最多 30 天，只限功能仍有效的狀態。
- PDF credit 當期補償每次 1–100，只改 limit；目前不要求第二位管理者批准。

後續再決定：

- 是否需要 future `support` / `finance` / `super_admin` 角色。
- 課程內容管理介面的實作階段。
- 敏感資料限時支援流程是否有實際需求。
- 是否要為高額、多次補償加入雙人審批或累積上限。

## 14. Task 8 Local 驗收狀態

- migration：`20260722185659_admin_control_plane.sql`。
- 空白 Local Supabase replay：通過。
- SQL integration、RPC 權限、Action Log 原子性：通過。
- Next.js Admin pages、server actions、二次確認與一般化錯誤：已完成。
- Preview migration、Admin 帳號逐頁操作與 Production release：尚未執行。
