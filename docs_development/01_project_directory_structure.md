# RAPID4GRAD — Application Architecture And Route Map

> 狀態：現行程式分層、實體路徑與 V2 目標架構的 Source of Truth
> 更新日期：2026-07-19
> 適用專案：`/Users/fengfeng/rapid 本機開發/build`
> 本文件描述程式放在哪裡、各層負責什麼，以及資料如何流動；產品與商業規則仍以 `08_product_business_model_v2.md` 至 `12_admin_control_plane_v2.md` 為準。

## 1. AI 閱讀規則

任何 AI 或開發者修改 RAPID4GRAD 前，必須先區分下列狀態：

| 標記 | 意義 |
|---|---|
| `IMPLEMENTED` | 路徑與程式目前存在；仍需檢查實際行為，不代表符合 V2 |
| `LEGACY` | 程式存在，但屬於舊 Phase 1/2 商業模式或相容流程 |
| `V2 PLANNED` | V2 已定案，但程式尚未建立或尚未完成改造 |
| `HISTORICAL` | 只保留歷史紀錄，不得作為新實作依據 |
| `DEPRECATED` | 不應再新增依賴，待安全遷移後移除 |

重要原則：

1. 文件出現某個 V2 route、table 或 service，不代表它已存在。
2. 判斷實作狀態時，以目前 Git branch 的檔案、migration 與測試為準。
3. 不得把 Client Component 當作權限防線。
4. 不得以 `profiles.role`、`profiles.is_paid` 或前端狀態單獨決定產品權限。
5. 高權限寫入必須經 Route Handler 或 Server Action，並由資料庫約束與 RLS 再驗證。
6. 不得直接修改已套用的 migration；V2 Baseline 重建另依 `11_database_baseline_v2_plan.md` 執行。

## 2. 六層應用程式架構

```text
Layer 1  Workspace / URL namespace
         Public、Student、Professor、Admin
                    ↓
Layer 2  Next.js Page / Layout
         app/**/page.tsx、layout.tsx、loading.tsx
                    ↓
Layer 3  Feature Component
         components/<feature>/*.tsx
                    ↓ fetch / server render
Layer 4  Route Handler / Server boundary
         app/api/**/route.ts、app/auth/**/route.ts
                    ↓
Layer 5  Domain service / policy helper
         lib/<domain>/*.ts
                    ↓
Layer 6  Supabase
         Auth、Postgres tables/RPC/RLS、private Storage
```

### 2.1 Layer 1：Workspace

| Workspace | URL namespace | 主要對象 | 權限來源 |
|---|---|---|---|
| Public | `/`, `/quiz`, `/course` 等 | 匿名與所有使用者 | 公開 route 或試用規則 |
| Student | `/dashboard/**` | 已登入 student | Session + workspace role + entitlement/Lab 狀態 |
| Professor | `/professor/dashboard`, `/professor/labs/**` | professor；admin 僅唯讀觀察 | Session + workspace role + Lab ownership/membership + subscription |
| Admin | `/admin/**` | admin | Session + admin role + server-side action authorization |

`/professor` 是 Phase 1 hidden demo，和正式 `/professor/dashboard` 不同，不得混用。

### 2.2 Layer 2：Page 與 Layout

- `page.tsx`：route 的頁面入口與 server-side 初始資料讀取。
- `layout.tsx`：workspace 共用外殼及第二層權限檢查。
- `loading.tsx`：Server Component 載入狀態。
- Server Component 可讀 session 與安全資料，但仍受 RLS 或 server authorization 約束。
- Client Component 只負責互動，不可持有 server secret。

### 2.3 Layer 3：Feature Components

元件依功能放在 `components/<feature>/`。元件可管理 UI state、表單與 fetch，但不得直接執行 Admin、高權限 membership、billing、credit 或 entitlement 更新。

### 2.4 Layer 4：Route Handlers

`app/api/**/route.ts` 是瀏覽器與 server domain logic 的安全邊界，負責：

- 驗證 session、role、ownership、subscription 與 entitlement。
- 驗證 request body、長度、格式及重送。
- 呼叫 domain service 或資料庫 RPC。
- 回傳一般化錯誤，不洩漏 raw database error。

### 2.5 Layer 5：Domain Services

`lib/` 依業務領域分類，不依頁面分類。Domain service 不應依賴 React UI，也不應將 server-only secret 匯出到 Client Component。

### 2.6 Layer 6：Supabase

Supabase 負責：

- Auth 與 session。
- Postgres 資料、唯一約束、transaction RPC 與 RLS。
- Private Storage PDF。
- Service-role server operation。

前端過濾不是多租戶安全措施；跨使用者與跨 Lab 隔離必須由 RLS、RPC 和 server authorization 完成。

## 3. 目前實體目錄

以下只列出目前存在且與產品程式有關的路徑，不包含 `.next/`、`node_modules/`、`.git/` 與 Supabase CLI 暫存檔。

```text
build/
├── app/                         # Next.js 15 App Router
│   ├── admin/                   # Admin workspace
│   ├── ai-command/              # 公開 AI 指令試用入口
│   ├── api/                     # Server Route Handlers
│   ├── auth/                    # OAuth login/callback routes
│   ├── billing/                 # Legacy Phase 2 subscription UI
│   ├── consultation/            # 公開諮詢頁
│   ├── course/                  # 課程銷售頁
│   ├── dashboard/               # Student workspace
│   ├── guide/                   # 免費指南
│   ├── login/                   # 共用登入頁
│   ├── payment/                 # Payment success/fail pages
│   ├── pricing/                 # Legacy Phase 2 pricing
│   ├── professor/               # Hidden demo + 正式 Professor workspace
│   ├── quiz/                    # 7 題問卷
│   ├── result/                  # 問卷結果
│   ├── layout.tsx
│   ├── page.tsx
│   ├── not-found.tsx
│   └── globals.css
├── components/
│   ├── ai-audit/
│   ├── ai-command/
│   ├── billing/
│   ├── course/
│   ├── labs/
│   ├── professor/
│   └── quiz/
├── lib/
│   ├── ai/
│   ├── documents/
│   ├── email-verification/
│   ├── labs/
│   ├── payments/
│   ├── prompt-builder/
│   ├── quiz/
│   ├── stripe/
│   ├── supabase/
│   └── workspace/
├── public/
├── supabase/
│   ├── migrations/
│   ├── migrations_legacy/
│   └── tests/
├── scripts/
├── tests/
├── types/
├── middleware.ts
├── package.json
└── README.md
```

目前沒有 `components/ui/`、`components/admin/`、`components/dashboard/`、`components/landing/`、`components/result/` 或 `hooks/`。AI 不得因舊文件曾列出這些路徑，就假設它們已實作。

## 4. Public Routes

| URL | 實體檔案 | 類型 | 狀態 | 責任 |
|---|---|---|---|---|
| `/` | `app/page.tsx` | Server | `IMPLEMENTED` | Landing page |
| `/quiz` | `app/quiz/page.tsx` | Client | `IMPLEMENTED` | Lead capture + 7 題問卷 |
| `/result` | `app/result/page.tsx` | Client | `IMPLEMENTED` | 顯示問卷風險與行動建議 |
| `/guide` | `app/guide/page.tsx` | Server | `IMPLEMENTED` | 免費指南 |
| `/course` | `app/course/page.tsx` | Server | `IMPLEMENTED` V2 local closure | 學生永久課程買斷入口；價格未公告或 provider 未啟用時不可結帳 |
| `/pricing` | `app/pricing/page.tsx` | Client | `LEGACY` | 現有 Stripe subscription plans，不是 V2 Professor 方案 |
| `/billing` | `app/billing/page.tsx` | Server | `LEGACY` | 現有 subscription 狀態與 portal |
| `/consultation` | `app/consultation/page.tsx` | Client | `IMPLEMENTED` | 諮詢 Lead 表單 |
| `/login` | `app/login/page.tsx` | Client | `IMPLEMENTED` | Google OAuth 登入 |
| `/auth/login` | `app/auth/login/route.ts` | Route GET | `IMPLEMENTED` | 以 request origin 建立 OAuth redirect |
| `/auth/callback` | `app/auth/callback/route.ts` | Route GET | `IMPLEMENTED` | Exchange session、safe next、workspace fallback |
| `/ai-command` | `app/ai-command/page.tsx` | Server | `IMPLEMENTED` | 匿名一次試用的公開 Prompt Builder |
| `/payment/success` | `app/payment/success/page.tsx` | Server + Client status panel | `IMPLEMENTED` V2 | 登入後以 owner-scoped API 輪詢訂單與永久權限開通狀態 |
| `/payment/fail` | `app/payment/fail/page.tsx` | Server | `IMPLEMENTED` | 中性付款失敗頁 |
| `/payment/test-checkout` | `app/payment/test-checkout/page.tsx` | Server + Client | `LOCAL TEST ONLY` | 本機簽章測試 provider 的成功／失敗／取消模擬頁；Production 回傳 404 |

## 5. Student Workspace

```text
/dashboard
├── /course
├── /ai-command
├── /ai-audit
│   └── /history
└── /lab-join
```

| URL | 實體檔案 | 組成／服務 | 狀態 |
|---|---|---|---|
| `/dashboard` | `app/dashboard/page.tsx` | Supabase browser client | `IMPLEMENTED`, partial legacy |
| `/dashboard/course` | `app/dashboard/course/page.tsx` | server Supabase access check | `IMPLEMENTED` V2 primary + Phase 1 fallback | 優先驗證永久 `course_full` entitlement；舊 `profiles.is_paid` / `course_access` 僅相容讀取 |
| `/dashboard/ai-command` | `app/dashboard/ai-command/page.tsx` | `AiCommandContainer`, CMS templates | `IMPLEMENTED` Phase 1 fallback |
| `/dashboard/ai-audit` | `app/dashboard/ai-audit/page.tsx` | Upload、Streaming、Sharing | `IMPLEMENTED` Phase 2；V2 eligibility 待改為 Lab-only |
| `/dashboard/ai-audit/history` | `app/dashboard/ai-audit/history/page.tsx` | audit jobs/results read | `IMPLEMENTED` |
| `/dashboard/lab-join` | `app/dashboard/lab-join/page.tsx` | `LabJoinForm` | `IMPLEMENTED`; V2 單一 active Lab invariant 待 baseline 落實 |

`app/dashboard/layout.tsx` 是 student workspace 的 server layout。`middleware.ts` 也會攔截未登入的 `/dashboard/**`，但 layout 與每個高權限 API 仍須自行驗證。現況只驗證登入，尚未在 layout 強制 `student` role；功能權限仍由個別 page/API 判斷。

## 6. Professor Workspace

```text
/professor                         # Phase 1 hidden mock demo
/professor/dashboard               # 正式 workspace
/professor/labs/[labId]
/professor/labs/[labId]/students/[studentId]
```

| URL | 實體檔案 | 組成／服務 | 狀態 |
|---|---|---|---|
| `/professor` | `app/professor/page.tsx` | mock students + demo modal | `LEGACY` hidden demo |
| `/professor/dashboard` | `app/professor/dashboard/page.tsx` | `ProfessorLabControls` | `IMPLEMENTED` Phase 2 |
| `/professor/labs/[labId]` | `app/professor/labs/[labId]/page.tsx` | Lab controls + summary data | `IMPLEMENTED` Phase 2 |
| `/professor/labs/[labId]/students/[studentId]` | `app/professor/labs/[labId]/students/[studentId]/page.tsx` | safe student detail | `IMPLEMENTED` Phase 2 |

V2 尚未完成：

- Standard 0–15、Plus 0–30、Enterprise 31+ 方案 UI。
- 每位 Professor 一個 active owned Lab。
- 每 Lab 一筆有效 subscription。
- 最多 3 位 active assistants。
- Lab owner 移除 student、assistant 或非 owner professor 的完整 UI/API。
- 移除 membership 與 summary consent 失效的同一受控 transaction。
- Subscription 失效後 Professor workspace read-only mode。
- `lab_basic` 影片入口。

正式規則見 `10_professor_subscription_and_seat_rules.md`。不得以 hidden demo 補足正式 workspace 的缺口。

`app/professor/layout.tsx` 目前只是 pass-through layout，沒有集中式 role guard；正式 `/professor/dashboard` 與動態 Lab pages 各自在 Server Page 驗證 professor/admin workspace access。這是目前實作事實，不得誤寫成 layout 已完成統一保護。未來若集中到 layout，API 與 resource scope 仍須個別驗證。

## 7. Admin Workspace

| URL | 實體檔案 | 狀態 | 責任 |
|---|---|---|---|
| `/admin` | `app/admin/page.tsx` | `IMPLEMENTED` legacy home | Admin 入口 |
| `/admin/leads` | `app/admin/leads/page.tsx` | `IMPLEMENTED` | Lead 狀態管理 |
| `/admin/quotas` | `app/admin/quotas/page.tsx` | `LEGACY` | Phase 1 Prompt 免費額度 |
| `/admin/templates` | `app/admin/templates/page.tsx` | `IMPLEMENTED` | Prompt Template CMS |

V2 `V2 PLANNED` routes：

```text
/admin/users
/admin/entitlements
/admin/labs
/admin/subscriptions
/admin/orders
/admin/pdf-credits
/admin/action-logs
/admin/course-content       # 後續
/admin/audit-consents       # 後續
```

上述 V2 routes 目前不存在。Admin 完整規格見 `12_admin_control_plane_v2.md`。

## 8. Components Map

### 8.1 Quiz

```text
app/quiz/page.tsx
└── components/quiz/QuizContainer.tsx
    ├── LeadCaptureForm.tsx
    ├── QuizProgressBar.tsx
    ├── QuizChoiceCard.tsx
    └── QuizNavigation.tsx
```

### 8.2 AI Command

```text
app/ai-command/page.tsx
app/dashboard/ai-command/page.tsx
└── components/ai-command/AiCommandContainer.tsx
    ├── StudentStageSelector.tsx
    ├── MeetingContextSelector.tsx
    ├── PainPointSelector.tsx
    ├── AiModelSelector.tsx
    ├── AdvisorPrefsInput.tsx
    ├── InstructionTypeSelector.tsx
    ├── GeneratedPromptDisplay.tsx
    └── UsageGateModal.tsx
```

Supporting data：`components/ai-command/options.ts`。

### 8.3 AI Audit

```text
app/dashboard/ai-audit/page.tsx
├── DocumentUploadForm.tsx
├── AuditStreamingPanel.tsx
└── AuditSummarySharing.tsx
```

### 8.4 Professor

```text
app/professor/dashboard/page.tsx
app/professor/labs/[labId]/page.tsx
└── ProfessorLabControls.tsx

app/professor/page.tsx (hidden demo)
├── StudentListTable.tsx
└── StudentDetailDrawer.tsx
```

### 8.5 Other

- `components/labs/LabJoinForm.tsx`：學生加入 Lab。
- `components/course/CourseCheckoutButton.tsx`：V2 一次性付款入口，支援 redirect / form POST，並維持單次操作 idempotency key。
- `components/course/PaymentStatusPanel.tsx`：付款後輪詢 owner-scoped 訂單狀態並導向完整課程。
- `components/course/TestCheckoutPanel.tsx`：僅供本機 signed test provider 驗收付款結果。
- `components/billing/CustomerPortalButton.tsx`：Legacy Stripe portal UI。

## 9. API Route Map

| API | 實體檔案 | Method | 主要資料／服務 | 狀態 |
|---|---|---|---|---|
| `/api/leads` | `app/api/leads/route.ts` | POST | `leads` | `IMPLEMENTED` |
| `/api/quiz/submit` | `app/api/quiz/submit/route.ts` | POST | `quiz_answers`, `leads`, Resend | `IMPLEMENTED` |
| `/api/consultation` | `app/api/consultation/route.ts` | POST | `leads` | `IMPLEMENTED` |
| `/api/email/verify` | `app/api/email/verify/route.ts` | POST | Resend, `email_verification_challenges` | `IMPLEMENTED` |
| `/api/ai-usage` | `app/api/ai-usage/route.ts` | POST | `free_usage_quotas`, `ai_instruction_usages` | `LEGACY` Phase 1 gate |
| `/api/documents/upload-url` | `app/api/documents/upload-url/route.ts` | POST | private Storage, subscription/credits | `IMPLEMENTED` Phase 2 |
| `/api/documents/complete` | `app/api/documents/complete/route.ts` | POST | actual PDF validation, `student_documents` | `IMPLEMENTED` Phase 2 |
| `/api/documents/share` | `app/api/documents/share/route.ts` | POST | `audit_summary_shares` | `IMPLEMENTED` Phase 2 |
| `/api/ai/audit` | `app/api/ai/audit/route.ts` | POST stream | AI SDK, Storage, jobs/results/credits | `IMPLEMENTED` Phase 2 |
| `/api/labs` | `app/api/labs/route.ts` | POST | `labs`, `lab_memberships` | `IMPLEMENTED` Phase 2 |
| `/api/labs/invite` | `app/api/labs/invite/route.ts` | POST/PATCH | invite create/revoke | `IMPLEMENTED` Phase 2 |
| `/api/labs/join` | `app/api/labs/join/route.ts` | POST | atomic invite join RPC | `IMPLEMENTED` Phase 2 |
| `/api/payments/checkout` | `app/api/payments/checkout/route.ts` | POST | V2 products/prices/orders + Payment Provider | `IMPLEMENTED` local closure；正式 provider / 價格待設定 |
| `/api/payments/webhook/[provider]` | `app/api/payments/webhook/[provider]/route.ts` | POST | provider 驗簽 + 原子 payment finalization RPC | `IMPLEMENTED` provider-neutral boundary；目前只有 local signed test provider 可完整驗收 |
| `/api/payments/orders/[orderId]` | `app/api/payments/orders/[orderId]/route.ts` | GET | owner-scoped order status | `IMPLEMENTED` V2 |
| `/api/billing/checkout` | `app/api/billing/checkout/route.ts` | POST | Stripe subscription checkout | `LEGACY` relative to V2 |
| `/api/billing/portal` | `app/api/billing/portal/route.ts` | POST | Stripe customer portal | `LEGACY` relative to V2 |
| `/api/webhooks/stripe` | `app/api/webhooks/stripe/route.ts` | POST | payment/subscription event handling | `IMPLEMENTED` Phase 2; V2 redesign required |

V2 尚缺少的 server boundaries 至少包括：

- Lab owner 移除成員。
- Professor Standard/Plus subscription checkout 與方案升級。
- V2 Admin users、entitlements、labs、subscriptions、orders、credits actions。
- Course content access-level management。

API 命名可在實作設計階段決定，但不得直接讓 Client Component 更新相關 tables。

## 10. Domain Service Map

| 路徑 | 責任 | Client 可否安全引用 |
|---|---|---|
| `lib/supabase/client.ts` | Browser Supabase client | 可以 |
| `lib/supabase/server.ts` | Session client + admin client | 只有 server；admin client 絕不可進 client bundle |
| `lib/workspace/access.ts` | safe next、workspace role 判斷 | 視函數是否含 server dependency |
| `lib/quiz/questions.ts` | 題目資料 | 可以 |
| `lib/quiz/scorer.ts` | Quiz 計分 | 可以，但正式結果仍應 server 重算 |
| `lib/prompt-builder/*` | Prompt types/templates/build | 可以，Phase 1 零 LLM fallback |
| `lib/email-verification/session.ts` | Email verification session | server only |
| `lib/documents/validation.ts` | PDF type/size/path rules | 共用純規則可引用；Storage operation 留 server |
| `lib/labs/invite-code.ts` | Invite normalize/hash/generate | server only |
| `lib/ai/providers.ts` | AI provider selection | server only |
| `lib/ai/audit-prompts.ts` | Audit system prompts | server only |
| `lib/ai/quota.ts` | Audit credits reserve/settle/refund | server only |
| `lib/stripe/server.ts` | Stripe server operations | server only |
| `lib/stripe/plans.ts` | Legacy Phase 2 plan config | 不可作 V2 pricing Source of Truth |
| `lib/stripe/event-ordering.ts` | Webhook ordering policy | server only |
| `lib/payments/provider.ts` | Provider-neutral interface | server only |
| `lib/payments/index.ts` | Provider selection | server only |
| `lib/payments/entitlements.ts` | 已驗證付款事件 → V2 原子 payment / entitlement RPC | server only |
| `lib/payments/test-provider-token.ts` | Local provider checkout token HMAC 簽章與驗證 | server only |
| `lib/payments/providers/test.ts` | 本機付款成功／失敗／取消／退款測試 provider | server only；Production 禁用 |
| `lib/payments/providers/ecpay.ts` | ECPay skeleton | 尚未實作真實 provider |

## 11. Middleware And Authorization

目前根目錄 `middleware.ts`：

- 保護 `/dashboard/**`。
- 保護 `/admin/**`，並檢查 admin role。
- 使用 Supabase publishable key 刷新 session。
- matcher 不包含 `/professor/**`；Professor routes 目前由 layout/page server-side guard 負責。

安全規則：

1. Middleware 只做第一層導流，不是最終授權。
2. Page/layout 要驗證 workspace access。
3. API 要重新驗證 session、role 與 resource ownership。
4. Database RLS/RPC 要提供最後防線。
5. Admin 進 Professor workspace 只能 read-only observation；任何寫入回到 `/admin` 受控 action。
6. Professor 只能管理自己的 Lab，不能跨 Lab。
7. Student 只能讀自己的 private PDF/raw audit。

## 12. Major Data Flows

### 12.1 Quiz Funnel

```text
/quiz
→ QuizContainer
→ LeadCaptureForm
→ POST /api/leads
→ leads
→ 7 answers + local scoring
→ POST /api/quiz/submit
→ quiz_answers + leads summary
→ Resend result email
→ /result
```

V2 實作時 quiz score 應在 server 依答案重算，不能只信任 client score。

### 12.2 Phase 1 Prompt Builder

```text
/ai-command or /dashboard/ai-command
→ server loads active prompt_templates
→ AiCommandContainer
→ POST /api/ai-usage
→ buildPrompt() locally
→ GeneratedPromptDisplay
→ user copies prompt to external AI
```

此流程不在 RAPID 上傳 PDF、不呼叫後端 LLM，必須保留作 fallback。

### 12.3 PDF AI Audit

```text
/dashboard/ai-audit
→ DocumentUploadForm
→ POST /api/documents/upload-url
→ private bucket student-documents
→ POST /api/documents/complete
→ verify actual metadata + %PDF- magic bytes
→ student_documents
→ AuditStreamingPanel
→ POST /api/ai/audit
→ reserve Lab/user credit
→ server downloads private PDF
→ Base64 + mediaType application/pdf
→ Vercel AI SDK streamText
→ ai_audit_jobs + ai_audit_results
→ settle/refund credit
→ /dashboard/ai-audit/history
```

V2 必須把 eligibility 與額度 Source of Truth 改為有效 Professor Lab 的 shared pool。

### 12.4 Audit Summary Sharing

```text
Student owns audit
→ POST /api/documents/share
→ audit_summary_shares(consented_at, revoked_at, lab_id)
→ summary-only database interface
→ same-Lab active professor/assistant
→ fixed safe summary fields only
```

Membership 結束或 owner 移除學生時，舊 Lab consent 必須立即失效。Professor/assistant 永遠不能因此取得 PDF 或 raw audit。

### 12.5 Lab Join

```text
Professor creates Lab
→ POST /api/labs
→ Professor creates invite
→ POST /api/labs/invite
→ Student enters code at /dashboard/lab-join
→ POST /api/labs/join
→ atomic database RPC
→ validate invite + membership + seat
→ create membership + increment usage
```

V2 Baseline 必須再保證：每位 student 一個 active Lab、Standard 15 seats、Plus 30 seats、每位 Professor 一個 active owned Lab、每 Lab 一筆有效 subscription。

### 12.6 Lab Member Removal — V2 PLANNED

```text
Lab owner selects member
→ Professor workspace confirmation + reason
→ server-only membership removal endpoint/action
→ verify owner and same Lab
→ transaction:
   membership status = removed
   summary consent for old Lab = revoked/invalid
   release active student/assistant seat
   write membership/admin action log
→ member immediately loses Lab-derived access
```

此流程不得刪除 Auth user、private PDF、raw audit、付款或個人永久 `course_full` entitlement。

### 12.7 V2 Student Course Purchase — V2 PLANNED

```text
/course
→ one-time checkout
→ order + payment
→ verified provider webhook
→ permanent course_full entitlement (no expiry)
→ /dashboard/course
```

Lab 優惠只在 checkout 時驗證有效 subscription + active student membership。離開 Lab 不撤銷已購買 entitlement。

### 12.8 V2 Professor Subscription — V2 PLANNED

```text
Professor plan page
→ Standard / Plus checkout
→ subscription bound to payer_user_id + owned lab_id
→ verified recurring webhook
→ subscription status
→ Professor workspace + lab_basic + shared PDF pool
```

Subscription 失效後停止 mutations、Lab videos 與新 PDF audits；Professor workspace 保留安全歷史唯讀。

## 13. Database And Storage Boundaries

目前資料庫分為兩個明確目錄：

- `supabase/migrations/`：乾淨 V2 Baseline `001`–`007`，以及 Task 3 學生買斷 extension `20260718222430_student_one_time_course_purchase.sql`；均已通過空白 Local replay。
- `supabase/migrations_legacy/`：原 Phase 1/2 migration 歷史，只供追蹤，不參與 V2 replay。

V2 baseline 的 table、RPC、RLS、Storage、grants 與 seed 分工見
`11_database_baseline_v2_plan.md`。Local 真實整合測試位於
`supabase/tests/v2_database_integration.sql`，由 `scripts/test-v2-database.sh` 執行。
學生一次性買斷的真實 DB integration 位於
`supabase/tests/v2_student_course_purchase_integration.sql`，由
`scripts/test-v2-student-course-purchase.sh` 執行。

現有應用程式仍使用 `types/database.ts` 維持 Phase 1 fallback 編譯；新 V2 schema 的獨立
generated types 位於 `types/database-v2.generated.ts`，後續 route 改造應逐步切換，不可在
Task 2 直接覆蓋 legacy types。

Storage：

| Bucket | Visibility | 用途 |
|---|---|---|
| `student-documents` | private | Student PDF |
| `ai-audit-exports` | private | Audit export |

禁止事項：

- 不可將 bucket 改成 public。
- 不可將 signed URL 或 Storage path 當作 Professor summary 欄位。
- 不可讓 Professor/assistant 直接 SELECT raw audit tables。
- 不可讓一般 authenticated client 直接修改 entitlement、subscription、quota、membership role 或 Admin logs。

## 14. V2 Source Of Truth Map

| 能力 | Source of Truth | 不可使用的捷徑 |
|---|---|---|
| Student full course | permanent `course_full` entitlement | `profiles.is_paid` 單一布林值 |
| Lab basic videos | active Lab membership + active Lab subscription | role alone |
| Professor workspace write | owner/scope + active subscription | page visibility alone |
| Professor workspace read-only | owner/scope + expired subscription policy | admin client without scope |
| PDF audit eligibility | active student membership + active subscription + Lab credits | student course purchase |
| Audit summary visibility | same Lab + active professor/assistant + active consent | direct raw table SELECT |
| Seat usage | count of active student memberships | manually editable counter |
| Admin mutation | server-side admin action + reason + action log | Client Component update |

## 15. V2 Implementation Gaps

目前文件已定案但程式尚未完整實作：

1. Student one-time full-course purchase 與永久 entitlement。
2. Professor Standard/Plus/Enterprise plans。
3. 每位 Professor 一個 active Lab。
4. 每 Lab 一筆有效 subscription。
5. Standard 15、Plus 30 的 transaction-level seat enforcement。
6. 每 Lab 最多 3 位 active assistants。
7. Lab owner 移除成員與 consent 同步失效。
8. Lab shared PDF credit pool 完整改造。
9. `public_preview`、`lab_basic`、`full_course` 影片分級資料模型與 UI。
10. V2 Admin routes 及 `admin_action_logs`。
11. Subscription 失效後 Professor read-only mode。
12. V2 payment provider 與 recurring billing 最終選擇。

AI 實作上述項目前，必須先讀相對應 V2 文件、提出 migration/API/UI 影響範圍，再開始修改。

## 16. File Placement Rules

新增功能時遵循：

```text
新 URL                 → app/<workspace>/<feature>/page.tsx
互動 UI                → components/<feature>/<Component>.tsx
HTTP/server boundary   → app/api/<feature>/route.ts
純商業規則             → lib/<domain>/*.ts
共用 TypeScript 型別   → types/ 或該 domain 的 types.ts
資料庫不變量/RLS/RPC   → supabase/migrations/<new_migration>.sql
整合/規則測試          → tests/*.test.ts 或 local integration test
```

禁止：

- 把所有邏輯塞進 `page.tsx`。
- 在 Client Component 使用 `SUPABASE_SECRET_KEY`、Stripe/Resend/AI provider secret。
- 由 Client Component 直接更新 membership、role、entitlement、subscription 或 credits。
- 為了符合舊文件建立目前不需要的空資料夾。
- 把 V2 planned 路徑標成 implemented。

## 17. 文件維護規則

下列變更必須同步更新本文件：

- 新增、刪除或更名 route。
- 新增 workspace 或角色入口。
- 新增 API、domain service 或 Storage bucket。
- V2 planned 功能正式完成。
- 權限 Source of Truth 或資料流改變。

更新時必須同時確認：

1. 實體檔案確實存在。
2. Route URL 與 App Router path 一致。
3. Client/Server 類型正確。
4. API method 與資料表責任一致。
5. `IMPLEMENTED`、`LEGACY`、`V2 PLANNED` 標記正確。
6. `README.md` 與 V2 文件沒有矛盾。

## 18. Exact File Inventory

此清單用於 AI 和自動檢查反查目前實體檔案。新增、刪除或更名後必須同步更新。

### 18.1 App Router files

```text
app/layout.tsx
app/not-found.tsx
app/page.tsx
app/admin/layout.tsx
app/admin/page.tsx
app/admin/leads/page.tsx
app/admin/quotas/page.tsx
app/admin/templates/page.tsx
app/ai-command/page.tsx
app/auth/login/route.ts
app/auth/callback/route.ts
app/billing/page.tsx
app/consultation/page.tsx
app/course/page.tsx
app/dashboard/layout.tsx
app/dashboard/page.tsx
app/dashboard/ai-command/page.tsx
app/dashboard/ai-audit/page.tsx
app/dashboard/ai-audit/history/page.tsx
app/dashboard/ai-audit/history/loading.tsx
app/dashboard/course/page.tsx
app/dashboard/lab-join/page.tsx
app/guide/page.tsx
app/login/page.tsx
app/payment/success/page.tsx
app/payment/fail/page.tsx
app/pricing/page.tsx
app/professor/layout.tsx
app/professor/page.tsx
app/professor/dashboard/page.tsx
app/professor/labs/[labId]/page.tsx
app/professor/labs/[labId]/students/[studentId]/page.tsx
app/quiz/page.tsx
app/result/page.tsx
app/api/ai-usage/route.ts
app/api/ai/audit/route.ts
app/api/billing/checkout/route.ts
app/api/billing/portal/route.ts
app/api/consultation/route.ts
app/api/documents/complete/route.ts
app/api/documents/share/route.ts
app/api/documents/upload-url/route.ts
app/api/email/verify/route.ts
app/api/labs/invite/route.ts
app/api/labs/join/route.ts
app/api/labs/route.ts
app/api/leads/route.ts
app/api/payments/checkout/route.ts
app/api/payments/orders/[orderId]/route.ts
app/api/payments/webhook/[provider]/route.ts
app/api/quiz/submit/route.ts
app/api/webhooks/stripe/route.ts
```

### 18.2 Feature components

```text
components/ai-audit/AuditStreamingPanel.tsx
components/ai-audit/AuditSummarySharing.tsx
components/ai-audit/DocumentUploadForm.tsx
components/ai-command/AdvisorPrefsInput.tsx
components/ai-command/AiCommandContainer.tsx
components/ai-command/AiModelSelector.tsx
components/ai-command/GeneratedPromptDisplay.tsx
components/ai-command/InstructionTypeSelector.tsx
components/ai-command/MeetingContextSelector.tsx
components/ai-command/PainPointSelector.tsx
components/ai-command/StudentStageSelector.tsx
components/ai-command/UsageGateModal.tsx
components/ai-command/options.ts
components/billing/CustomerPortalButton.tsx
components/course/CourseCheckoutButton.tsx
components/course/PaymentStatusPanel.tsx
components/course/TestCheckoutPanel.tsx
components/labs/LabJoinForm.tsx
components/professor/ProfessorLabControls.tsx
components/professor/StudentDetailDrawer.tsx
components/professor/StudentListTable.tsx
components/quiz/LeadCaptureForm.tsx
components/quiz/QuizChoiceCard.tsx
components/quiz/QuizContainer.tsx
components/quiz/QuizNavigation.tsx
components/quiz/QuizProgressBar.tsx
```

### 18.3 Domain and infrastructure files

```text
lib/ai/audit-prompts.ts
lib/ai/providers.ts
lib/ai/quota.ts
lib/documents/validation.ts
lib/email-verification/session.ts
lib/labs/invite-code.ts
lib/payments/entitlements.ts
lib/payments/index.ts
lib/payments/provider.ts
lib/payments/providers/ecpay.ts
lib/payments/providers/test.ts
lib/payments/test-provider-token.ts
lib/payments/types.ts
lib/prompt-builder/builder.ts
lib/prompt-builder/templates.ts
lib/prompt-builder/types.ts
lib/quiz/questions.ts
lib/quiz/scorer.ts
lib/stripe/event-ordering.ts
lib/stripe/plans.ts
lib/stripe/server.ts
lib/supabase/client.ts
lib/supabase/server.ts
lib/workspace/access.ts
middleware.ts
types/database.ts
```
