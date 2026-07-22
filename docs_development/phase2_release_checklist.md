# RAPID4GRAD — Phase 2 Release Checklist

> [!IMPORTANT]
> **歷史驗收文件**：本文記錄 2026-07-19 前既有 Phase 2 程式、migration 與安全驗收，不代表 V2 商業模式已實作。V2 已改為學生完整課程買斷、Professor Lab Standard 最多 15 位／Plus 最多 30 位／31 位以上洽談、Lab 部分影片與學生加購升級、PDF AI 稽核僅限有效訂閱 Lab。現行產品與權限規格請讀 `08_product_business_model_v2.md`、`09_entitlement_and_access_matrix_v2.md`、`10_professor_subscription_and_seat_rules.md`；資料庫重建方向請讀 `11_database_baseline_v2_plan.md`。

## 0. V2 轉向狀態

- 本文件中的 `student_monthly`、`student_semester`、個人 subscription PDF quota、NT$ 2,400 + 6 個月工具，以及舊 `course_access` / `profiles.is_paid` 判斷均屬既有程式或歷史規格。
- V2 文件已完成書面定義，但程式、付款、課程資料模型與 Supabase Baseline 尚未依 V2 重建。
- 在 V2 重建完成前，不得把本文既有通過項目解讀為新版商業模式已可上線。
- 本文件既有安全驗收紀錄繼續有效，可作為 V2 RLS、Storage、OAuth、concurrency 與 webhook 測試基礎。
- 現有 `/admin/leads`、`/admin/quotas`、`/admin/templates` 只代表 Legacy Admin 已有基礎功能；V2 Admin Control Plane 尚未實作，規格見 `12_admin_control_plane_v2.md`。
- V2 後續需要驗收 server-side Admin role guard、entitlement 補發／撤銷、subscription/seat/credit 異常處理及 `admin_action_logs`；在完成前不得宣稱新版權限管理介面閉環。

更新時間：2026-07-11 CST

本文件記錄 Phase 2 整合驗收狀態。此輪僅做 release audit、靜態驗收與文件化，不執行 merge、不部署 production、不打真實付款、不呼叫真實 AI provider。

---

## 1. Release 範圍

Phase 2 目標是在不破壞 Phase 1 fallback 的前提下，新增：

- Stripe Billing 訂閱與 AI 額度。
- Supabase private Storage PDF 上傳。
- Vercel AI SDK streaming PDF 學術稽核。
- 真實 Professor Lab 與 invite code 綁定。
- Lab 多租戶 RLS 隔離。

Phase 1 fallback 必須保留：

- `/dashboard/ai-command`
- `/ai-command`
- free usage gate
- `course_access` 舊課程權限
- `/professor` hidden demo

---

## 2. 靜態驗收總結

| 項目 | 狀態 | 結論 |
|---|---:|---|
| `npm run lint` | 通過 | ESLint 無錯誤 |
| `npm run build` | 通過 | Next.js 15.5.19 production build 成功 |
| forbidden TODO/fake 搜尋 | 通過 | `rg "TODO\|省略\|fake\|placeholder implementation" app lib components supabase` 無結果 |
| public secret 搜尋 | 通過 | `rg "NEXT_PUBLIC_OPENAI\|NEXT_PUBLIC_ANTHROPIC\|NEXT_PUBLIC_STRIPE_SECRET" .` 無結果 |
| Next.js 15 async 檢查 | 通過但需持續維護 | Server `cookies()` 已 await；dynamic route `params` 已 await；client `useSearchParams()` 屬 client hook，不適用 server async 規則 |
| Supabase RLS lab isolation | 通過靜態檢查 | Phase 2 migration 使用 `EXISTS` policies；另新增 profile visibility policy |
| Phase 1 fallback 保護 | 通過靜態檢查 | `/dashboard/ai-command`、`/ai-command`、`/professor` 仍存在 |

### 2.1 Security closure 工作分支

- 本機分支：`security-hotfix`，基準為 `oauth-preview-hotfix` commit `84b670f`。
- 本輪不 push、不部署、不執行 remote migration、不修改任何 Vercel / Supabase / Stripe / AI provider 雲端設定。
- Audit history 分段查詢程式已完成；Preview app 層已確認可顯示 graceful error UI，但 remote 仍回 `42P17`，因此 Empty State 與真實歷史資料仍屬待人工驗收，不能標記完成。
- Professor invite revoke API/UI 已完成，不重做。
- Invite join 原子 transaction、AI audit reserve/settle/refund、profiles 敏感欄位、free quota、Email verification、PDF 真實檔案驗證、Stripe event ordering 仍依本文件後續紀錄逐項關閉。

### 2.2 Profiles 與免費額度資料安全

- 新增 local migration `20260710230403_protect_profile_and_quota_data.sql`，尚未套用 remote。
- `profiles` 對 authenticated 僅授權更新基本資料欄位；`role`、`is_paid`、`paid_at`、`course_expires_at`、email 與時間戳等敏感欄位不可由一般 client 更新。
- `free_usage_quotas` 移除公開 SELECT / INSERT / UPDATE policies，並撤銷 anon/authenticated table privileges。
- `/admin/quotas` 改由已通過 admin layout role guard 的 Server Component 使用 server-only admin client 讀取；管理 action 原本即使用 admin client。
- Migration 末端附有 RLS/column privilege 人工驗收 SQL，保持註解且不會自動執行。
- 狀態：本機實作完成，remote migration 與 authenticated JWT 測試待醒來後人工驗收。

### 2.3 Email verification session

- 新增 local migration `20260710230611_harden_email_verification_sessions.sql`，尚未套用 remote。
- 驗證 challenge 只保存 HMAC email hash、HMAC PIN hash、不可逆 HMAC IP hash、嘗試次數與到期時間；table 對 anon/authenticated 完全不可讀寫。
- `verify_email_challenge` 使用 row lock 原子增加錯誤嘗試次數，僅授權 `service_role` 執行。
- `/api/email/verify` 不再把可重用 token 回傳 React；challenge id 與驗證成功 session 均使用 HttpOnly、Secure（production）、SameSite=Lax cookie。
- 驗證成功 session 為 10 分鐘短效 HMAC token，`/api/ai-usage` 仍會向 service-only challenge table確認 verified/expiry/email hash，不能只信任 cookie payload。
- 加入 4KB request body、Email 254 字元、PIN 格式、每 Email cooldown、15 分鐘 Email/IP 發送上限與最多五次 PIN 嘗試。
- `/api/ai-usage` 不再接受 client email 作為授權來源；只使用 Supabase authenticated user email 或 server 驗證 session email，並加入 24KB body 與所有情境欄位長度/allowlist 驗證。
- 前端僅保存「本次 UI 已驗證」布林值以控制互動；實際授權完全由 HttpOnly cookie 與 server DB challenge 決定。
- API 對外不再回傳 raw database error；詳細狀況僅以一般化 code/name 寫入 server log。
- 新增 local migration `20260711074936_make_email_challenge_limits_atomic.sql`；send challenge 改由 service-only RPC 使用 Email/IP hash transaction advisory locks，在同一 transaction 內檢查 cooldown/window limits 並 insert，關閉 count-then-insert race。
- 原子 RPC 不保存 raw Email/IP，固定空 `search_path`，撤銷 PUBLIC/anon/authenticated execute，只授權 service_role。
- 狀態：本機 typecheck/lint 通過；local Supabase 尚未完成 DB integration test。remote migration、Resend 寄信、同 Email/IP 並行 request 與 quota flow 待人工驗收。

### 2.4 Lab invite atomic join

- 新增 local migration `20260710231046_make_lab_invite_join_atomic.sql`，尚未套用 remote。
- `join_lab_with_invite` 為 `SECURITY DEFINER` service-only RPC，固定空 `search_path`，並撤銷 PUBLIC/anon/authenticated execute。
- RPC 在同一 transaction 內驗證 target profile 必須為 student、鎖定 invite row、檢查 revoked/expiry/max uses、鎖定既有 membership、建立或恢復 student membership，最後才將 used_count + 1。
- 已 active 的重複加入回傳 `alreadyJoined=true` 且不增加 used_count；任何例外會回滾整個 function，不留下 membership 或使用次數。
- `/api/labs/join` 只信任 Supabase session user id，以 server-only admin client 呼叫 RPC；request body 限制 2KB，invite code 有長度與字元 allowlist。
- Admin/professor 不可透過 invite 取得 student membership；admin observation workspace 維持原設計。
- 狀態：本機實作完成；remote migration、concurrency final-slot、撤銷/過期/額滿/重複加入待醒來後人工驗收。

### 2.5 PDF 真實檔案驗證與 AI audit quota lifecycle

- 新增 local migration `20260710231313_reserve_and_settle_ai_audit_credits.sql`，尚未套用 remote。
- `/api/documents/complete` 不再接受或相信 client 的 filename、MIME、size/storagePath；server 只接受 session-bound documentId、objectPath 與 allowlisted documentType。
- Server 從 private `student-documents` bucket 下載真實 object，使用 Blob Content-Type、實際 byte length 與前五 bytes `%PDF-` 驗證；超過 10MB、MIME 不符或 magic bytes 不符時會刪除 object。
- 寫入 `student_documents` 的 filename 來自實際 storage object path，MIME 與 size 來自下載 object；錯誤回應一般化，詳細 validation boolean 僅留 server log。
- `ai_audit_jobs` 新增 credit id 與 reserved/settled/refunded timestamps，形成可稽核 quota lifecycle。
- `reserve_pdf_audit_credit` 在模型呼叫前鎖定 job/credit 並原子增加 `pdf_audit_used`；最後一份額度的並行請求只允許一筆成功。
- `complete_ai_audit_job` 在單一 transaction 內 upsert result、寫 token/cost、標記 job completed 與 reservation settled。
- `fail_ai_audit_job` 對 setup error、stream error 或 abort 原子退款並標記 failed；重複呼叫最多退款一次，completed job 不可退款。
- `streamText.onFinish/onError/onAbort` 全部使用 async awaited persistence，不再用 `void` 將唯一資料寫入留在 response 結束後的未追蹤 Promise。
- PDF 仍以 server-side Base64、AI SDK v6 `mediaType: "application/pdf"` 多模態 file part 傳入；沒有新增或呼叫任何真實 provider credential。
- 狀態：本機 lint/build 通過；remote migration、private Storage 真實 PDF、quota concurrency、stream complete/error/abort 待醒來後人工驗收。

### 2.6 Stripe event ordering 與 idempotency

- 新增 local migration `20260711071234_harden_stripe_event_ordering.sql`，尚未套用 remote。
- `subscriptions` 新增 `last_stripe_event_created_at` / `last_stripe_event_id`；subscription 狀態更新改以 Stripe event created time 判斷新舊，不再將相同 `current_period_end` 一律視為 stale。
- `cancel_at_period_end`、`past_due`、`unpaid` 與 `customer.subscription.deleted` 可在 period 不變時套用；deleted event 強制正規化為 canceled。
- Stripe `event.created` 為秒級；同秒事件採限制優先：restrictive status 或新增 `cancel_at_period_end` 可套用，但同秒較寬鬆狀態不可恢復 entitlement 或重補額度，也不使用 event id 字典序推測先後。
- `stripe_events` 改為 processing / processed / failed 兩階段狀態，包含 processing timeout reclaim、attempts 與一般化 failure message。
- `claim_stripe_event` 使用 unique event id 與 row lock，避免兩個 webhook worker 同時處理；processed event 永不重跑，failed 或超過 10 分鐘的 processing event可安全重試。
- Restrict 狀態會將當期 credit limits 收斂至已用量，避免違反 `used <= limit` constraint；恢復 active/trialing 時可還原 plan limits。實際授權仍先檢查 subscription status。
- 新增 `lib/stripe/event-ordering.ts` 與 `tests/stripe-event-ordering.test.ts`；離線 fixtures 覆蓋 older/newer、同秒 active→canceled、同秒 canceled→active 拒絕、cancel signal、duplicate restrictive state，以及 past_due/unpaid/canceled/deleted restriction。
- `npm test`（tsx + Node test runner）目前七項 fixtures 全數通過，沒有送出任何真實 Stripe request；failed recovery 仍由 `claim_stripe_event` 的 failed/timeout reclaim 與 duplicate event id 保護。
- npm install audit 顯示 2 個 moderate dependency advisories；未執行破壞性 `npm audit fix --force`，列為 dependency review 待辦。
- 狀態：本機 test/lint/build 通過；remote migration、Stripe Test Mode signature、event resend、payment_failed/cancel/deleted 真實 webhook 待醒來後人工驗收。

### 2.7 AI audit SELECT RLS recursion closure

- Preview 曾在 `ai_audit_jobs` owner history query 實際回傳 PostgreSQL `42P17`；因此 `006` 不足以證明 audit SELECT chain 已閉環。
- 新增 local migration `20260711071816_fix_ai_audit_rls_recursion.sql`，尚未套用 remote，且不修改已執行的 `001` 至 `006`。
- Student document 與 audit job/result SELECT policies 收斂為單一 scalar authorization helper；helper 只針對傳入 UUID 與當前 `auth.uid()` 回傳 boolean，不回傳資料列。
- Helper 使用固定空 `search_path`、撤銷 PUBLIC/anon execute，只授權 authenticated/service_role；student owner、同 Lab active professor/assistant、admin observation 三種範圍明確分離。
- 狀態：本機 migration 完成；remote 套用後需以 student/professor/跨 Lab/admin 四角色及 `42P17` 回歸測試人工驗收。

### 2.8 Audit summary explicit consent

- 新增 local migration `20260711074505_add_audit_summary_sharing_consent.sql` 與 `audit_summary_shares`。
- 預設沒有 consent row 即完全私人；student 只能把自己的文件摘要分享給自己 active 加入的 Lab，並可隨時寫入 `revoked_at` 撤回。
- 後續 P0 審核發現：只靠 job/result row-level consent 仍可能讓 professor 透過 Data API 選取 `input_prompt`、`error_message`、`result_markdown` 與 token/cost，因此不能視為安全閉環。
- 新增 local migration `20260711153412_restrict_shared_audit_access_to_summaries.sql`：professor/assistant 不再直接 SELECT 原始 `ai_audit_jobs` 或 `ai_audit_results`；owner 與 admin 維持完整讀取。
- Professor/assistant 僅能呼叫 `get_shared_audit_summaries`，固定回傳 `job_id`、`student_user_id`、`summary`、`risk_level`、`issue_tags`、`completed_at`、`created_at` 七欄。
- RPC 在資料庫內重新檢查指定 Lab、active professor/assistant membership、active consent 與 `revoked_at IS NULL`；撤回後下一次查詢立即不可見。
- Professor 三個正式頁面已移除原始 audit table 查詢，只使用登入 session 呼叫 summary RPC。
- `student_documents` 與 `storage.objects` 的 professor read policy 被移除；分享 summary 不會產生 signed URL，也不會授權 PDF 本文。
- Admin observation 維持既有獨立權限。
- 狀態：10 個離線 tests、typecheck/lint 通過；其中 3 個 contract tests 驗證固定七欄、consent/membership/revoke 條件與 raw helper 僅 owner/admin。實際 migration/RLS、grant/revoke 即時性、跨 Lab 與 admin observation 仍待 local 或 Preview DB integration test，尚不可宣稱資料庫閉環已實測。

#### 2.8.1 Transient raw-access release gate closure

- Preview 人工套用前審核發現，第 6 份 timestamp migration 原本允許同 Lab professor/assistant 直接 SELECT raw `student_documents`、`ai_audit_jobs` 與 `ai_audit_results`；第 7 份雖增加 consent，仍會透過覆寫 `app_can_read_ai_audit_job` 暫時開放完整 prompt、error、result markdown 與 token/cost rows，直到第 9 份才收斂。
- 因第 6、第 7、第 9 份 timestamp migration 均尚未套用 Preview，本機直接修正尚未發布的 migration：第 6 份從套用完成當下即限制 raw rows 為 owner/admin；第 7 份只建立可撤回 consent 並維持 PDF/Storage 私有，不再覆寫 raw audit helper；第 9 份才建立固定七欄的 summary-only RPC。
- 新增 migration-order contract tests，逐段鎖定第 6 份 owner/admin raw helper、第 7 份不得新增 raw policy/helper、第 8 份 Email migration 不得接觸 audit authorization，以及第 9 份固定七欄 RPC。
- Timestamp migration 數量與順序維持 12 份；已套用的 `001` 至 `006` baseline 未修改。Preview 仍須逐份人工套用並以 student、same-Lab professor/assistant、cross-Lab、revoke、admin 與 private Storage 情境驗收。

---

## 3. Phase 2 Flow 驗收

### 3.1 Subscription Checkout

涉及檔案：

- `app/pricing/page.tsx`
- `app/api/billing/checkout/route.ts`
- `lib/stripe/server.ts`
- `lib/stripe/plans.ts`

靜態驗收結果：

- `/pricing` 讀取 `BILLING_PLANS` 顯示 `student_monthly`、`student_semester`、`professor_lab`。
- 前端 POST `/api/billing/checkout`。
- API Route 檢查登入，未登入回 401。
- server-side 使用 `STRIPE_SECRET_KEY` 建立 subscription checkout。
- plan price env 來源為：
  - `STRIPE_PRICE_STUDENT_MONTHLY`
  - `STRIPE_PRICE_STUDENT_SEMESTER`
  - `STRIPE_PRICE_PROFESSOR_LAB`

真實環境待驗收：

- Vercel Production / Preview env 必須填入 Stripe secret 與三組 price id。
- Stripe Dashboard 必須建立對應 subscription prices。
- 登入後點 `/pricing` 任一方案，應導向 Stripe Checkout。

狀態：靜態通過，真實付款流程待人工測試。

---

### 3.2 Billing Portal

涉及檔案：

- `app/billing/page.tsx`
- `app/api/billing/portal/route.ts`
- `components/billing/CustomerPortalButton.tsx`

靜態驗收結果：

- `/billing` 是 server page，未登入 redirect `/login?next=/billing`。
- 頁面讀取 `subscriptions` 與 `ai_usage_credits` 顯示狀態。
- `/api/billing/portal` 檢查登入，查 `stripe_customer_id`，server-side 建立 Customer Portal session。

真實環境待驗收：

- Stripe Customer Portal 必須在 Stripe Dashboard 啟用。
- 已付款 user 必須有 `subscriptions.stripe_customer_id`。

狀態：靜態通過，Customer Portal 真實跳轉待人工測試。

---

### 3.3 Stripe Subscription Webhook

涉及檔案：

- `app/api/webhooks/stripe/route.ts`
- `lib/stripe/server.ts`

靜態驗收結果：

- webhook 使用 `await request.text()` 讀 raw body。
- 使用 `stripe-signature` header。
- `verifyStripeSignature()` 使用 HMAC-SHA256 與 `timingSafeEqual`。
- 使用 `stripe_events.stripe_event_id` 做 idempotency。
- 已處理事件：
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
- Subscription mutation 以 Stripe event `created` timestamp 與 event id 判斷順序，不再把相同 `current_period_end` 一律視為 stale。
- `cancel_at_period_end`、`past_due`、`unpaid`、`deleted` 即使 period 不變，只要事件較新仍會更新狀態並限制 entitlement。
- Webhook 先以 `claim_stripe_event` 將事件標記 processing，完成後標記 processed；failed 或逾時 processing event 可重試。
- Phase 1 one-time checkout fallback 仍保留 `payments` / `course_access` / `profiles.is_paid` 更新邏輯。

本機驗證：

- 離線 fixture 測試已覆蓋 older/equal/newer event、same-period cancellation、past_due、unpaid 與 deleted restriction。
- 真實 Stripe signature、Dashboard resend 與 Customer Portal 仍需 Preview 人工驗收。

真實環境待驗收：

- Stripe Webhook endpoint 必須指向 `/api/webhooks/stripe`。
- `STRIPE_WEBHOOK_SECRET` 必須填入 Vercel。
- 用 Stripe CLI 或 Dashboard resend event 驗證重送不重複補額度。

狀態：核心防線靜態通過，真實 webhook resend 測試待人工執行。

---

### 3.4 PDF Upload

涉及檔案：

- `app/dashboard/ai-audit/page.tsx`
- `components/ai-audit/DocumentUploadForm.tsx`
- `app/api/documents/upload-url/route.ts`
- `app/api/documents/complete/route.ts`
- `lib/documents/validation.ts`

靜態驗收結果：

- `/dashboard/ai-audit` 未登入 redirect `/login?next=/dashboard/ai-audit`。
- 上傳前檢查有效 subscription 與 `ai_usage_credits`。
- PDF 限制：
  - mime type: `application/pdf`
  - extension: `.pdf`
  - size: 10MB
- 使用 private bucket `student-documents`。
- `objectPath` 格式為 `{user_id}/{document_id}/{filename}`。
- 對外顯示的 storage path 為 `student-documents/{user_id}/{document_id}/{filename}`。
- 前端使用 Supabase signed upload token 上傳。
- `/api/documents/complete` 重新計算 expected path，user id 來自 server session，不信任前端傳入 user id。
- metadata 寫入 `student_documents`，`upload_status = ready`。

真實環境待驗收：

- Supabase migration 002 必須已在目標環境執行。
- Storage bucket `student-documents` 必須存在且 private。
- 已訂閱且有額度的 user 實際上傳 PDF，Supabase Storage 與 `student_documents` 應各有紀錄。

狀態：靜態通過，真實上傳待人工測試。

---

### 3.5 AI Streaming Audit

涉及檔案：

- `app/api/ai/audit/route.ts`
- `components/ai-audit/AuditStreamingPanel.tsx`
- `lib/ai/providers.ts`
- `lib/ai/audit-prompts.ts`
- `lib/ai/quota.ts`

靜態驗收結果：

- API Route 檢查登入。
- API Route 檢查文件 owner 或 lab professor / assistant membership。
- API Route 檢查 subscription 與 `ai_usage_credits`。
- 建立 `ai_audit_jobs`，狀態由 `queued` 更新到 `streaming`。
- 從 Supabase private Storage server-side 下載 PDF。
- PDF 轉為 Base64。
- Vercel AI SDK v6 file part 使用：
  - `type: "file"`
  - `mediaType: "application/pdf"`
  - `data: pdfBase64`
  - `filename`
- 注意：規格文字寫 `mimeType: "application/pdf"`；AI SDK v6 實際 file part 欄位為 `mediaType`。本實作使用 AI SDK v6 正確欄位，語義上即 MIME type。
- `streamText()` 以 streaming response 回傳。
- `onFinish({ text, usage })` 內 await 原子完成：
  - `ai_audit_results.summary`
  - `ai_audit_results.result_markdown`
  - `risk_level`
  - `issue_tags`
  - `token_input`
  - `token_output`
  - `cost_estimate_cents`
- 模型呼叫前先以 RPC 原子 reserve 額度；`onFinish` settle，`onError` / `onAbort` fail + refund。
- persistence callback 使用 async/await，不再依賴未追蹤的 `void` Promise。
- 前端提供 Phase 1 fallback link `/dashboard/ai-command`。

待人工驗收：

- `/dashboard/ai-audit/history` 已完成，但新的 audit SELECT RLS migration 尚未套用 remote。
- 真實 AI provider 需要 Vercel AI Gateway / provider credentials；本輪未呼叫真實模型。
- 需在 Preview 驗證 stream complete/error/abort 的 settle/refund 與 history persistence。

狀態：本機 streaming、history 與原子 quota lifecycle 完成；remote migrations 與真實 provider 流程待人工驗收。

#### 2026-07-11 Preview history hotfix

- `/dashboard/ai-audit/history` 已存在，並已隨 `006_fix_lab_memberships_rls_recursion.sql` 補上 RLS recursion 修正與 graceful error UI。
- `006` 已由 Supabase SQL Editor 手動套用，repo 僅保留 migration 歷史，不得重複對 remote 執行。
- Preview 實測 OAuth 登入成功，但原本的巢狀 PostgREST relation query 在 Server Component 資料載入階段仍可能造成未捕捉例外。
- history 頁改為分段查詢：先讀當前 user 的最近 20 筆 `ai_audit_jobs`，再依 IDs 讀取 `student_documents` 與 `ai_audit_results`，最後在 server 端組合顯示資料。
- 所有 Supabase query error 與非預期例外均轉為一般化 graceful error UI；server log 僅記錄錯誤類型或 code，不向畫面暴露 raw SQL、policy 名稱、欄位內容或資料庫錯誤訊息。
- 若 user 沒有任何 job，必須直接顯示 Empty State，不執行額外關聯查詢。
- 本 hotfix 不修改 OAuth、workspace role guard、RLS migration、Stripe、AI provider、Storage 或 Phase 1 fallback。
- 狀態：程式修正完成後仍需重新部署 `oauth-preview-hotfix` Preview，並以 student 帳號驗收 Empty State、歷史資料與友善錯誤頁。

---

### 3.6 Professor Lab Invite

涉及檔案：

- `app/professor/dashboard/page.tsx`
- `app/professor/labs/[labId]/page.tsx`
- `app/professor/labs/[labId]/students/[studentId]/page.tsx`
- `app/dashboard/lab-join/page.tsx`
- `app/api/labs/route.ts`
- `app/api/labs/invite/route.ts`
- `app/api/labs/join/route.ts`
- `lib/labs/invite-code.ts`
- `supabase/migrations/002_phase2_platform_schema.sql`
- `supabase/migrations/003_lab_profile_visibility.sql`

靜態驗收結果：

- `/professor/dashboard` server-side 檢查登入與 professor workspace 權限；`profiles.role = professor` 與 `profiles.role = admin` 可進入，student 不可進入。
- Professor 可建立 lab。
- 建立 lab 後同步 professor membership。
- Professor 可產生 invite code。
- invite code 明碼只回傳一次，DB 只存 `code_hash`。
- invite code 支援：
  - `expires_at`
  - `max_uses`
  - `used_count`
  - `revoked_at`
- `/dashboard/lab-join` 讓學生輸入 invite code。
- `/api/labs/join` 驗證 session 後呼叫 service-only `join_lab_with_invite` RPC，由單一 transaction 鎖定、驗證、建立 membership 與遞增 used_count。
- 只有 student role 可兌換 invite；重複 active membership 不增加 used_count。
- Professor dashboard 顯示 lab students、最近 AI audit summary、risk level、issue tags、更新時間。
- hidden demo `/professor` 保留，正式入口為 `/professor/dashboard`。

已完成補強：

- Invite revoke API/UI 已存在，撤銷後立即更新前端狀態。
- Invite join 已改為原子 RPC；remote migration 後仍需測撤銷、過期、額滿、重複加入與 final-slot concurrency。

狀態：本機 flow、revoke 與原子 join 完成；remote migration 與跨租戶人工驗收待執行。

---

## 4. Phase 1 Fallback 驗收

| Fallback | 路由 / 檔案 | 靜態狀態 |
|---|---|---|
| Public AI command | `/ai-command` | 存在，讀匿名 trial httpOnly cookie |
| Dashboard AI command | `/dashboard/ai-command` | 存在，保留 CMS template / local fallback |
| Free usage gate | `/api/ai-usage` + `UsageGateModal` | 存在，匿名 1 次、Email verified quota、paid access bypass |
| Old course access | `course_access` + `/dashboard/course` | 存在，未被 Phase 2 subscriptions 移除 |
| Hidden professor demo | `/professor` | 存在，metadata noindex，與 `/professor/dashboard` 分開 |

狀態：Phase 1 fallback 靜態保護通過。

---

## 5. Secrets 檢查

執行：

```bash
rg "NEXT_PUBLIC_OPENAI|NEXT_PUBLIC_ANTHROPIC|NEXT_PUBLIC_STRIPE_SECRET" . --glob '!node_modules/**' --glob '!.next/**'
```

結果：無輸出。

目前 `.env.example` 有 server-side placeholders：

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SECRET_KEY`

未發現 server secret 使用 `NEXT_PUBLIC_` 前綴。

---

## 6. RLS 檢查

### 6.1 Owner isolation

靜態檢查：

- `student_documents` owner policies 以 `user_id = auth.uid()` 控制 owner read/update。
- Storage object policy 以 path 第一段 user id 對應 `auth.uid()`。
- `/api/documents/complete` 重新計算 expected storage path，不信任前端 user id。

### 6.2 Lab isolation

靜態檢查：

- `labs`、`lab_memberships`、`student_documents`、`ai_audit_jobs`、`ai_audit_results` 皆使用 `EXISTS` policy 做 lab membership / lab owner 隔離。
- `profiles` 新增 `profiles: lab professor can view active lab students`，只允許 lab owner professor 讀 active student profile。

### 6.3 Admin visibility

靜態檢查：

- Phase 2 migration 中 admin policies 與 professor policies 分開。
- `/admin` layout server-side 檢查 admin role。

### 6.4 建議人工 RLS 測試

1. 建立 professor A、professor B、student S。
2. professor A 建 Lab A，student S 加入 Lab A。
3. professor B 嘗試查 Lab A membership、student documents、audit jobs、audit results，應不可見。
4. professor A 可見 student S summary。
5. student S 僅可見自己的 documents / jobs / results。
6. admin 可見所有資料。

---

## 7. Next.js 15 Async Guard

搜尋：

```bash
rg "cookies\(|headers\(|params|searchParams" app lib middleware.ts
```

靜態結論：

- `lib/supabase/server.ts` 使用 `const cookieStore = await cookies()`。
- `/ai-command` 與 `/dashboard/ai-command` 使用 `await cookies()`。
- `/professor/labs/[labId]` 使用 `const { labId } = await params`。
- `/professor/labs/[labId]/students/[studentId]` 使用 `const { labId, studentId } = await params`。
- Admin pages 使用 `const params = await searchParams`。
- `app/result/page.tsx` 使用 client `useSearchParams()`，不屬 Server Component async 規則。
- `app/auth/callback/route.ts` 使用 `new URL(request.url).searchParams`，不屬 Next page `searchParams` prop。

狀態：通過。

---

## 8. 未完成風險與建議修正順序

### P0 — 上線前必須人工設定

1. Vercel env：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `NEXT_PUBLIC_SITE_URL`
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_STUDENT_MONTHLY`
   - `STRIPE_PRICE_STUDENT_SEMESTER`
   - `STRIPE_PRICE_PROFESSOR_LAB`
2. Supabase migrations:
   - `002_phase2_platform_schema.sql`
   - `003_lab_profile_visibility.sql`
3. Supabase Storage:
   - `student-documents` private bucket exists
   - `ai-audit-exports` private bucket exists
4. Stripe:
   - Billing products / prices created
   - Webhook endpoint `/api/webhooks/stripe` created
   - Customer Portal enabled
5. Vercel AI Gateway / provider:
   - AI SDK route can access `openai/gpt-5.4`
   - AI SDK route can access `anthropic/claude-sonnet-4.6`

### P1 — 後續人工驗收與營運補強

1. 使用 Preview 真實角色驗證 owner / same-lab / cross-lab / admin RLS。
2. 使用並行請求驗證 invite final slot 與 AI audit 最後一份額度。
3. 使用 Stripe Test Mode fixtures / resend 驗證 processing / processed / failed recovery。
4. 建立依賴套件 moderate advisories 的非破壞性升級計畫。
5. 建立文件分享 consent、分享時間與撤回機制後，才允許教授讀取學生 PDF 本文。

---

## 9. Workspace / Role 分流補充

Phase 2 Preview 驗收時發現 student / professor / admin workspace 需要清楚分流。RAPID4GRAD 短期仍維持同一套 app、同一套 Supabase Auth、同一套 DB，但 UI route、OAuth callback、`next` 與 role fallback 必須依 workspace 架構處理。

已新增架構文件：

```text
docs_development/06_workspace_role_architecture.md
```

核心定位：

- student workspace：研究生自己的 Dashboard、AI 指令、PDF AI 稽核與 Lab join。
- professor workspace：教授 Lab Dashboard、學生進度與 AI audit summary。
- admin observation workspace：公司負責人 / 內部觀察者，用於資料觀察、營運管理與驗收。

admin 不是一般 professor，也不是一般 student。admin 可進 professor workspace 是為了驗收 / 觀察，也可進 `/admin` 做營運管理。

後續任何 AI / Codex 修改登入、OAuth callback、dashboard、professor、admin 相關程式前，必須先閱讀：

```text
docs_development/06_workspace_role_architecture.md
```

OAuth callback / `next` / role fallback 必須遵守：

- 有 safe `next` 時優先尊重 `next`。
- `next` 必須是站內相對路徑。
- 禁止 `https://evil.com`。
- 禁止 `//evil.com`。
- Preview OAuth callback 必須使用目前 request / browser origin，不可用 `NEXT_PUBLIC_SITE_URL` 決定 callback origin。
- 沒有 `next` 時，依 `profiles.role` fallback 到預設 workspace。

---

## 10. 本輪命令紀錄

已執行：

```bash
npm run lint
npm run build
rg "TODO|省略|fake|placeholder implementation" app lib components supabase
rg "NEXT_PUBLIC_OPENAI|NEXT_PUBLIC_ANTHROPIC|NEXT_PUBLIC_STRIPE_SECRET" .
rg "cookies\(|headers\(|params|searchParams" app lib middleware.ts
rg "code_hash|lab_memberships|EXISTS" supabase app lib
```

結果：

- lint 通過。
- build 通過。
- forbidden text 搜尋無結果。
- public secret 搜尋無結果。
- lab RLS / invite code 關鍵字存在。

---

## 11. Release 判斷

目前狀態：

- 程式碼層可 build。
- 核心安全防線靜態驗收通過。
- Phase 1 fallback 未被破壞。
- Phase 2 真實流程尚未完成端到端人工驗收，原因是需外部服務設定與真實事件：
  - Stripe checkout / webhook / portal。
  - Supabase production migrations / storage buckets。
  - Vercel AI Gateway 或 provider credentials。
  - 真實 PDF 上傳與 AI streaming。

建議：

1. 先不要直接 merge production。
2. 先在 Preview 環境補齊 env 與 Supabase migration。
3. 用測試帳號跑一次 `/pricing` → Stripe test checkout → webhook → `/billing`。
4. 用同帳號跑一次 `/dashboard/ai-audit` PDF upload → AI streaming。
5. 建 professor 測試帳號，手動將 `profiles.role` 改為 `professor`，跑 `/professor/dashboard` → invite → student join → professor summary。
6. 全部通過後再 merge main。

### 11.1 2026-07-11 最後本機驗證

- Stripe 同秒事件限制優先規則完成，7 個離線 unit tests 通過。
- Audit summary consent API/UI/RLS migration 完成；預設私人、可撤回、summary-only，不開放 PDF/Storage。
- Email challenge send limit 改為 service-only 原子 RPC，關閉 count-then-insert race。
- `npm test`：10/10 通過（7 個 Stripe ordering + 3 個 summary RPC contract tests）。
- `npm run lint`：通過。
- `npx tsc --noEmit --incremental false`：通過。
- `npm run build`：Next.js 15.5.19 production build 通過，共 46 routes。
- `supabase status`：未通過，原因是本機 Docker daemon 未啟動。因此 consent RLS、Email 並行 transaction 與 migration integration test 尚未在 local DB 實際執行，必須保留為人工驗收項目。
- 本輪沒有 push、沒有執行 remote migration、沒有變更 Preview/Production 或任何雲端設定。

---

## 12. 2026-07-07 Supabase RLS Hotfix 紀錄

### 問題

Preview 測試 `/dashboard/ai-audit/history` 時出現 Next.js server-side exception：

```text
Application error: a server-side exception has occurred
Digest: 1721378370
```

Vercel logs 展開後確認根因：

```text
Error: infinite recursion detected in policy for relation "lab_memberships"
```

判斷原因：

```text
ai_audit_jobs / ai_audit_results SELECT
→ RLS 檢查 lab professor visibility
→ 查 lab_memberships
→ lab_memberships policy 間接查 labs
→ labs policy 又查 lab_memberships
→ RLS recursion
```

### 修補方式

新增 migration：

```text
supabase/migrations/006_fix_lab_memberships_rls_recursion.sql
```

修補內容：

- 建立自包含 role helper：
  - `public.app_current_user_role()`
  - `public.app_is_admin()`
  - `public.app_is_professor()`
- 建立 lab access helper：
  - `public.app_can_manage_lab(target_lab_id uuid)`
  - `public.app_can_access_lab(target_lab_id uuid)`
  - `public.app_has_lab_role(target_lab_id uuid, allowed_roles text[])`
- helper 使用 `SECURITY DEFINER` 與 `SET search_path = ''`。
- `REVOKE ALL FROM PUBLIC`，只授權 `authenticated` 與 `service_role` 執行。
- 重建會造成遞迴的 policies：
  - `labs`
  - `lab_invite_codes`
  - `lab_memberships`
  - `student_documents`
  - `ai_audit_jobs`
  - `ai_audit_results`

### 執行狀態

此 hotfix 已由 Supabase SQL Editor 手動執行成功：

```text
Success. No rows returned
```

注意：

- 由 SQL Editor 手動執行的 SQL 會實際修改 remote database。
- 但不一定會出現在 Supabase CLI migration history 的 Remote 欄位。
- 後續若使用 `supabase db push`，必須先確認 remote migration 狀態，避免重複套用或誤判 drift。

### Supabase CLI 狀態

本機 Supabase CLI 已登入，並可讀取 project：

```text
project name: rapid4grad
project ref: qrfbshncmakvcfjraxiu
region: ap-northeast-1
status: ACTIVE_HEALTHY
linked: true
```

已執行只讀檢查：

```bash
supabase projects list
supabase migration list
```

### UI 防線

本機已修改：

```text
app/dashboard/ai-audit/history/page.tsx
```

修補內容：

- 原本 Supabase query error 會 `throw new Error(error.message)`，造成整頁黑畫面。
- 已改成顯示「目前無法讀取稽核歷史」的 graceful error UI。

注意：

- 本次 `fix(supabase): resolve lab membership rls recursion` commit 會納入此 UI 修補與 006 migration。
- 本次 commit 後仍需 push 至 `oauth-preview-hotfix` 並等待新的 Preview deployment；在此之前，Preview 尚未包含 graceful error UI。
- 006 已由 SQL Editor 手動套用成功；本次只將相同 migration 納入 Git schema 歷史，不會重新執行 remote SQL。

### 驗收建議

1. 重新整理 `/dashboard/ai-audit/history`。
2. 預期不再看到 `Application error`。
3. 若該帳號沒有任何稽核紀錄，應看到 empty state。
4. 若仍有權限錯誤，部署 graceful error UI 後應顯示可讀錯誤，而不是黑畫面。
5. Preview 驗收尚未完成；本輪 commit 後不得據此直接 merge main 或 deploy production。

---

## 13. 2026-07-12 Local Integration / Preview Preflight

### 13.1 Git 與 migration 基線

- Branch：`security-hotfix`。
- Merge base：`origin/oauth-preview-hotfix` commit `84b670f`。
- `006_fix_lab_memberships_rls_recursion.sql` 已由 SQL Editor 手動套用 remote，不可再次執行。
- `supabase migration list --linked` 本輪只停在 `Initialising login role...`，未取得可採信的 remote migration history；因此 remote history 狀態標記為「本機無法確認」，不可據此執行 `db push`。
- 12 份 timestamp security migrations 仍按以下 local 順序保存：
  1. `20260710230403_protect_profile_and_quota_data.sql`
  2. `20260710230611_harden_email_verification_sessions.sql`
  3. `20260710231046_make_lab_invite_join_atomic.sql`
  4. `20260710231313_reserve_and_settle_ai_audit_credits.sql`
  5. `20260711071234_harden_stripe_event_ordering.sql`
  6. `20260711071816_fix_ai_audit_rls_recursion.sql`
  7. `20260711074505_add_audit_summary_sharing_consent.sql`
  8. `20260711074936_make_email_challenge_limits_atomic.sql`
  9. `20260711153412_restrict_shared_audit_access_to_summaries.sql`
  10. `20260711203753_grant_authenticated_profile_reads.sql`
  11. `20260711204203_grant_phase2_rls_table_access.sql`
  12. `20260711204357_fix_email_challenge_timestamp_type.sql`

### 13.2 Local Supabase migration replay

- Docker Engine `29.6.1`、Postgres、Auth、REST、Storage 與 Kong 均正常。
- 從空白 local database 完整重播 baseline 與全部 security migrations 成功。
- Repo 保留既有兩份 `002_*` migration 原檔名；Supabase CLI 無法接受重複 migration version，因此 local replay 在 `/tmp` 驗收副本將 `002_payment_service_foundation.sql` 映射為測試版本 `007`。此映射不修改 Git 歷史，也不得直接套用 remote。
- 新增三份 local-only migration：
  1. `20260711203753_grant_authenticated_profile_reads.sql`：補 authenticated profile SELECT 與 service-role CRUD，不放寬 authenticated UPDATE。
  2. `20260711204203_grant_phase2_rls_table_access.sql`：補 Phase 2 RLS 所需 table-level SELECT 與 server-only CRUD grants。
  3. `20260711204357_fix_email_challenge_timestamp_type.sql`：避免 `current_time` 與 PostgreSQL 內建名稱衝突，維持 challenge 比較為 TIMESTAMPTZ。
- 本輪沒有執行 remote SQL、`supabase db push` 或使用 Preview 取代 local integration。

### 13.3 DB integration 驗收狀態

以下項目已在 disposable local database 實際通過：

- student owner 只能讀自己的 profile；其他 student profile 為 0 rows。
- student 可更新 `full_name`，但 `role`、`is_paid` 等敏感欄位沒有 UPDATE privilege。
- `free_usage_quotas` 對 anon/authenticated 無 SELECT/INSERT/UPDATE privilege。
- Email challenge 同 Email/IP 雙連線併發結果為一個 `created`、一個 `cooldown`，資料列總數為 1。
- Invite 最後名額雙連線競爭只有一位 student 成功，`used_count=1` 且只建立一筆 active membership。
- AI audit reserve 重送不重複扣額度；failed 重送只退款一次；completed 重送只保留一筆 result；completed job 不可退款。
- same-Lab professor/assistant 直接讀 raw audit jobs/results 為 0 rows，只能由 summary RPC 取得固定七欄。
- cross-Lab professor、inactive/revoked consent 查詢為 0 rows；student owner 與 admin observation 符合設計。
- professor 無法讀取 student private Storage object。
- Stripe event first claim、processing duplicate、failed retry、processed duplicate 與 attempts 計數符合 idempotency 設計。
- Transient raw-access checkpoints 已分別從空白 DB replay 驗證：第 6 份完成後 professor/assistant 對 `student_documents`、`ai_audit_jobs`、`ai_audit_results` 與 private Storage 均為 0 rows；第 7 份加入 active consent 後仍為 0；第 8 份 Email migration 後仍為 0；第 9 份後 direct raw SELECT 仍為 0，且 summary RPC 才開始回傳固定七欄。
- 第 9 份 checkpoint 與最終 12 份全量 replay 均確認：same-Lab professor/active assistant summary 各 1 row、cross-Lab 0 rows、removed assistant 0 rows、revoke 後立即 0 rows；student owner 對自己的 raw rows/Storage 各 1 row，admin 對 raw tables 各 1 row。

### 13.4 不依賴 DB 的本機 preflight

- `npm test`：14/14 通過，包含 4 個 migration-order contract tests。
- `npm run lint`：通過。
- `npx tsc --noEmit --incremental false`：通過。
- `npm run build`：Next.js 15.5.19 production build 通過，共 46 routes。

### 13.5 Gate 判斷

- 程式編譯、離線 contract/unit tests 與 local Supabase migration/RLS/RPC/Storage integration 均已通過。
- 三份新增 migration 仍為 local-only，remote migration history 尚未取得可採信結果；`006` 已由 SQL Editor 手動套用，不可重複執行。
- 結論：repo 已具備進入「Preview Supabase migration 人工審核」的本機條件；在確認 remote history、解決既有重複 `002` version 映射並逐份審核 SQL 前，不可執行 `db push`。
- 本輪未 push、merge、deploy、執行 remote SQL、`supabase db push` 或修改任何雲端設定。

---

## 14. 2026-07-13 Local Final Release Readiness

本節是 Phase 2 在「只使用本機 repo + Local Supabase/Docker」條件下的最終 release-readiness 稽核。基準為 `security-hotfix` commit `beebbd5`；本輪未 push、merge、deploy、執行 linked/remote SQL，亦未修改任何 Vercel、Supabase Dashboard、Stripe、Google OAuth 或 AI provider 設定。

### 14.1 本機已驗證完成

- Git 基準：branch `security-hotfix`，P0 migration/RLS 基準 commit `beebbd5 fix(rls): prevent transient raw audit exposure`。
- Migration inventory：保留 `001` 至 `006` baseline 與 12 份 timestamp migrations；既有兩份 `002_*` 原檔名不變。因 Supabase CLI 不接受重複 version，本機 disposable replay 副本只將 payment foundation 映射為測試版 `007`，不修改 Git 或 remote history。
- 從空白 Local Supabase database 完整 replay baseline、payment foundation 與 12 份 timestamp migrations成功。
- 第 6、7、8、9 份 timestamp checkpoint均在同一空白 DB序列實測：same-Lab professor/assistant 對 `student_documents`、`ai_audit_jobs`、`ai_audit_results` 與 private PDF Storage始終為 0 rows；active consent不會暫時開放 raw rows；第 9 份完成後才可透過固定七欄 summary RPC讀取摘要。
- Profile：student可更新 `full_name` 等基本欄位；實際更新 `role`、`is_paid` 被資料庫拒絕，authenticated沒有整表 UPDATE privilege。
- Free quota：anon/authenticated沒有 `free_usage_quotas` SELECT/INSERT/UPDATE privilege，實際讀寫均被拒絕。
- Email challenge：sequential cooldown為 `created` 後 `cooldown`；連續五次錯誤 PIN後狀態為 `locked`；雙連線同 Email/IP併發僅一筆 `created`、另一筆 `cooldown`，資料列總數為 1。
- Lab invite：expired/revoked invite均失敗且不留下 membership；最後一個名額雙連線併發只有一位 student成功，另一位回 `invite_limit_reached`，`used_count=1` 且 active membership只有一筆。
- AI audit quota：重複 reserve不重複扣除；failed重送只退款一次；complete重送只保留一筆 result；completed job不可退款，最終 `pdf_audit_used`與 job lifecycle一致。
- Consent/RLS：same-Lab professor與 active assistant可由 RPC讀 summary；cross-Lab與 removed assistant為 0 rows；revoke後下一次查詢立即為 0；student owner與 admin raw access符合設計。
- Summary RPC：輸出固定為 `job_id`、`student_user_id`、`summary`、`risk_level`、`issue_tags`、`completed_at`、`created_at` 七欄，不包含 prompt、error、markdown、token/cost或 PDF metadata。
- Storage：professor/assistant對 private student PDF object為 0 rows；student owner可讀自己的 object。
- Stripe DB lifecycle：first claim成功、processing duplicate拒絕、failed finish可 retry、processed duplicate拒絕，attempts最終為 2。純函數 fixtures亦驗證 older/newer、duplicate、同秒 restrictive ordering、past_due/unpaid/canceled/deleted限制規則。
- OAuth/workspace純本機驗證：login使用 `window.location.origin`，OAuth route使用 `requestUrl.origin`，callback使用 `request.url`；auth flow沒有 `NEXT_PUBLIC_SITE_URL`或 production domain固定導向。`isSafeNextPath`接受站內 `/...`，拒絕 `https://...`、`//...`與 null。fallback為 student `/dashboard`、professor `/professor/dashboard`、admin `/admin`。
- 程式驗證：`npm test` 14/14、`npm run lint`、`npx tsc --noEmit --incremental false`與 Next.js 15.5.19 production build（46 routes）全部通過。

### 14.2 程式已完成但只能由外部服務驗收

- Google OAuth真實 provider登入、cookie交換、Preview origin callback與各 workspace最終 redirect。
- Resend真實寄送：Quiz結果信與 AI command Email OTP deliverability、寄件網域與退信行為。
- Stripe Test Mode：subscription checkout、signature驗證、Dashboard webhook resend、payment_failed/cancel/deleted與 Customer Portal。
- 真實 AI provider / Vercel AI Gateway：PDF streaming、provider response、`onFinish/onError/onAbort`在 Vercel runtime的 persistence與實際 token/cost。
- Vercel Preview runtime：Server Components、middleware、environment scope、deployment protection與 function logs。
- Supabase遠端環境：migration history、兩份 `002_*`的實際 schema對應，以及 `006`已由 SQL Editor手動套用但可能沒有 migration-history row的 drift判讀。

### 14.3 明確 blocked 的外部項目

- 目前 Supabase只有 Production `main`，沒有 staging/preview database；GitHub connection亦未建立。因此不得在 Production main用 timestamp migrations當測試環境。
- 在建立隔離 Supabase staging/preview database前，Preview migration套用、遠端 RLS角色測試、真實 Storage/Auth整合均標記為 blocked。
- 真實 AI provider credential尚未確認，因此 streaming E2E標記為 blocked；Phase 1 `/dashboard/ai-command` fallback仍應保留。
- Stripe/Google OAuth/Resend/Vercel均需要外部服務設定與測試帳號；本機成功不等同外部 E2E完成。

### 14.4 Production release 前必要人工步驟

1. 建立獨立 Supabase staging/preview database；Production `main`不得作為 migration試跑環境。
2. 在隔離資料庫以唯讀 SQL核對 migration history與實際 schema，特別處理兩份 `002_*`與已手動套用的 `006`；不可因 history缺列就重跑 baseline。
3. 依審核順序逐份人工套用 12 份 timestamp migrations，每份完成後執行對應 RLS/RPC/grant驗收；任何錯誤立即停止。
4. 將 Vercel Preview環境變數只指向隔離 Supabase；Production env保持不變，再重新部署 Preview。
5. 以 student、professor、assistant、cross-Lab professor、admin測試 OAuth、workspace、Lab、consent、Storage與 audit history。
6. 在 Stripe Test Mode、Resend測試寄送與真實 AI provider sandbox完成外部 E2E；未通過項目不可標記完成。
7. 完成 Preview驗收與 release sign-off後，才決定是否 push/PR/merge及 Production migration/deploy。Production操作必須另行明確授權。

### 14.5 Gate 判斷

- 本機可解決的 Phase 2 schema、RLS、RPC、concurrency、Storage isolation、OAuth純邏輯與編譯工作已完成，未發現新的本機程式阻塞。
- Repo可安全進入 GitHub push/PR候選階段，但本輪不 push。
- Phase 2尚不可宣告 Production-ready；外部 E2E與隔離 Supabase migration驗收仍是 release gate。

---

## 15. 2026-07-22 V2 Task 9 Local Integration Validation

本節記錄 `v2/lab-pdf-shared-pool` branch 的 V2 Task 9 本機驗收。驗收基準為 commit `dc4a5ca` 加上尚未提交的 Task 8 Admin、Email verification P0 修補與測試變更。本輪沒有執行 commit、push、merge、deploy、remote SQL 或任何雲端設定修改。

### 15.1 P0 Email verification 修補

新增 local-only migration：

```text
supabase/migrations/20260722190000_restore_email_verification_rpcs.sql
```

修補內容：

- 建立 `create_email_verification_challenge` 原子 RPC。
- 以 transaction advisory lock 保護相同 Email/IP 的 cooldown 與 rate limit。
- 建立 `verify_email_challenge` 原子 RPC，以 row lock 累加 `failed_attempts`。
- 第 5 次錯誤 PIN 會鎖定 challenge，過期 challenge 不可再驗證。
- 兩個 RPC 均使用固定 `search_path`、撤銷 `PUBLIC`、`anon`、`authenticated` 執行權，只授權 `service_role`。
- `types/database.ts` 已同步 RPC 型別。
- 新增 Local integration fixture、並行測試 runner 與 contract test。

此 migration 尚未套用任何 remote Supabase 環境。

### 15.2 Local integration matrix

| 領域 | 狀態 | 本機驗證結果 |
|---|---|---|
| V2 migration replay | Passed | 從空白 Local Supabase 依序重播 V2 baseline、Task 3 至 Task 8 與 Email P0 migration，共 15 份 migration 成功。 |
| Profiles 權限 | Passed | 基本個人欄位可更新；role、billing、entitlement 等敏感欄位不可由一般 authenticated user 更新。 |
| Email verification | Passed | cooldown、Email/IP 次數限制、錯誤 PIN、5 次鎖定、過期與平行請求均通過；相同 Email/IP 平行建立只產生一筆 challenge。 |
| Student 永久課程 | Passed | `course_full` 永久 entitlement、payment idempotency、並行付款與人工退款審查規則通過。 |
| 三層課程內容 | Passed | `public_preview`、`lab_basic`、`full_course` 權限隔離通過；Professor/assistant 不可查看學生影片進度。 |
| Professor subscription | Passed | 單一 owned Lab、單一 current subscription、30 天免綁卡 trial、15 天 past_due grace 與唯讀失效 workspace 通過。 |
| Lab seats 與 assistants | Passed | Standard 第 16 位被阻擋、Plus 上限 30、active assistant 最多 3 位。 |
| Lab invite/join/remove | Passed | 每位 student 僅一個 active Lab；final-slot concurrency 只允許一人成功；移除 member 會同步撤銷 consent 並留下 action log。 |
| Lab shared PDF credits | Passed | reserve、settle、refund、idempotency 與最後額度 concurrency 通過。 |
| Private PDF isolation | Passed | 僅 owner 可讀 private PDF；Professor、assistant、admin 不可讀 Storage PDF object 或 raw audit。 |
| Summary consent | Passed | same-Lab active staff 只可讀固定七欄 summary；cross-Lab、inactive assistant 與 revoke 後皆為 0 rows。 |
| Admin control plane | Passed | mutation 必須有 reason、server-side role check、二次確認與 action log；log 不保存 raw audit/PDF/secret。 |
| Stripe local lifecycle | Passed | ordering、duplicate、retry、同秒 restrictive state 與 terminal subscription 防恢復 contract/integration 測試通過。 |
| OAuth/workspace 邏輯 | Passed | callback 使用 current origin；safe `next` 拒絕 `https://` 與 `//`；student/professor/admin fallback 通過靜態測試。 |
| Phase 1 Prompt Builder fallback | Passed | `/ai-command` 與 `/dashboard/ai-command` route、匿名試用、CMS fallback、外部執行指引與零後端 LLM contract 通過。 |

### 15.3 Quality gates

```text
npm test                                  Passed: 67/67
npm run lint                              Passed
npx tsc --noEmit --incremental false      Passed
npm run build                             Passed: Next.js 15.5.19, 60 pages
git diff --check                          Passed
```

第一次 sandbox build 因無法寫入 `.next/trace` 回傳 `EPERM`；取得本機專案建置輸出寫入權限後完整 build 通過。此為執行環境權限，不是程式缺陷。

### 15.4 Blocked External

以下項目不可由本機驗收取代，目前仍是外部 release gate：

- 真實 Google OAuth provider 登入、cookie/session 交換與 Preview workspace redirect。
- Resend OTP 與 Quiz 結果信的實際投遞、退信與寄件網域行為。
- ECPay 真實 checkout、付款通知、取消與重送事件。
- 真實 AI provider PDF streaming、runtime persistence、token/cost 與失敗恢復。
- Vercel Preview environment scope、middleware、Server Components、function logs 與 deployment protection。
- Remote Supabase migration、RLS、Storage bucket/policy 與 Auth 整合。

### 15.5 Gate conclusion

- V2 Task 9 可在本機完成的 migration replay、RLS、RPC、concurrency、Storage isolation、OAuth 純邏輯、Phase 1 fallback 與 production build 均已通過。
- Task 8 Admin 與本輪 Email P0 修補仍未 commit，必須先由使用者審核 Git scope。
- 本機驗收完成不代表 Preview 或 Production 已完成。
- 下一步只能在另行明確授權後進行 commit/push、V2 Preview Supabase migration 與 Vercel Preview E2E。
