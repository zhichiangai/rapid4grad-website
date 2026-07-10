# RAPID4GRAD — Phase 2 Release Checklist

更新時間：2026-06-30 23:52 CST

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
- `syncSubscriptionFromStripe()` 會比較 incoming `current_period_end` 與 DB 既有 `subscriptions.current_period_end`。
- 若 incoming period end 較舊或相等，回傳 stale，不覆蓋 `subscriptions`，不補額度。
- `invoice.payment_failed` 會用 `forceRestrictCredits` 將高成本 AI 額度限制為 0。
- Phase 1 one-time checkout fallback 仍保留 `payments` / `course_access` / `profiles.is_paid` 更新邏輯。

風險：

- `stripe_events` 是在 `processStripeEvent()` 完成後才 insert。若處理過程中 DB 寫入部分成功但最後拋錯，Stripe 重送時可能重跑部分邏輯。現有邏輯大多以 upsert / existing check 降低重複風險，但仍建議未來升級為「先記錄 processing event，再標記 processed」的兩階段 idempotency。

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
- `onFinish({ text, usage })` 後非阻塞寫入：
  - `ai_audit_results.summary`
  - `ai_audit_results.result_markdown`
  - `risk_level`
  - `issue_tags`
  - `token_input`
  - `token_output`
  - `cost_estimate_cents`
- `onFinish` 後更新 job 為 `completed`，並遞增 PDF audit usage。
- `onError` 更新 job 為 `failed`。
- 前端提供 Phase 1 fallback link `/dashboard/ai-command`。

風險：

- `/dashboard/ai-audit/history` 獨立 history route 尚未存在。現有頁面只列出可選 PDF 與即時 streaming panel；教授端頁面可看 audit summary，但學生端沒有獨立歷史頁。
- `incrementPdfAuditUsage()` 是 read-then-update，若同一 user 高併發啟動多個 audit，可能有 race condition。正式大量使用前建議改為 SQL RPC 原子遞增或 update expression。
- 真實 AI provider 需要 Vercel AI Gateway / provider credentials；本輪未呼叫真實模型。

狀態：核心 streaming 防線靜態通過；學生 audit history route 與高併發 quota 原子性待補強。

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
- `/api/labs/join` 驗證 code hash、expiry、revoked、usage limit。
- 學生加入後建立 `lab_memberships`。
- Professor dashboard 顯示 lab students、最近 AI audit summary、risk level、issue tags、更新時間。
- hidden demo `/professor` 保留，正式入口為 `/professor/dashboard`。

風險：

- `used_count` increment 為 read-then-update，極端併發使用同一 invite code 時可能超過 max uses。正式大量發碼前建議改為 SQL RPC 原子驗證與遞增。
- 目前沒有 UI revoke invite code；schema 支援 `revoked_at`，但管理操作尚未做。

狀態：核心 flow 靜態通過，revoke UI 與 invite atomic increment 待補強。

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

### P1 — 功能補強

1. 建立學生端 audit history route，例如 `/dashboard/ai-audit/history`。
2. 將 invite `used_count` 改為 SQL RPC 原子驗證與遞增。
3. 將 `ai_usage_credits.pdf_audit_used` 改為 SQL RPC 原子遞增。
4. 增加 revoke invite code UI。
5. Stripe webhook idempotency 可升級為 processing / processed 兩階段紀錄。

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
