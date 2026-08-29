# RAPID4GRAD — Professor System Architecture V1

> 文件狀態：Architecture V1.1 final freeze review
> 更新日期：2026-08-30
> 適用專案：`/Users/fengfeng/rapid 本機開發/build`
> 本文件只描述 Professor System 的 logical architecture，不建立資料表、不修改程式、不代表規劃功能已完成。

## 1. 文件定位

Professor System 是 **Research Supervision System**，用來協助教授持續掌握學生研究進度、會議決策、待辦與需要關注的風險。

它不是：

- CRM
- Trello、Notion 或 Jira
- Slack 或 Chat 系統
- Google Drive 或文件管理系統
- ERP、會計或營收儀表板
- 完整 LMS
- Professor Chatbot

本 V1 採用 **Extend Existing Foundation**，不是重建另一套教授產品。現有 Student、Professor、Admin 共用一套 Next.js App、Supabase Auth 與 Supabase 資料庫。

## 2. 核心循環

```text
Student Progress
      ↓
Risk / Attention
      ↓
Professor Review
      ↓
Meeting
      ↓
Action Items
      ↓
Student Execution
      ↓
New Progress
```

Professor Dashboard 的目的不是收集第二份資料，而是把學生已經產生的研究資料整理成教授可以採取行動的 supervision context。

## 3. 六層架構

### L1 — Lab

- Lab identity
- Lab membership
- Professor、assistant、student relationship
- Lab-level supervision context

### L2 — Student

- Student identity
- Research profile
- Current research status
- Student Research 360

### L3 — Progress

- Weekly Update
- Research progress
- Research milestone
- Current blocker
- Next plan

### L4 — Meeting

- Meeting record
- Meeting summary
- Decisions
- Action Items
- Deadlines
- Next meeting

### L5 — Attention

- Risk signal
- No recent update
- Overdue action
- High risk
- Deadline approaching
- Professor attention priority

### L6 — Professor Overview

- Needs Attention
- This Week
- Upcoming Meetings
- Students Overview

## 4. 應用程式分層與邊界

```text
T1  Workspace / URL namespace
    Public、Student、Professor、Admin
             ↓
T2  Next.js Page / Layout
    app/**/page.tsx、layout.tsx、loading.tsx
             ↓
T3  Feature Components
    components/<feature>/*.tsx
             ↓
T4  Server Boundary
    app/api/**/route.ts、app/auth/**/route.ts
             ↓
T5  Domain Services / Authorization
    lib/<domain>/*.ts
             ↓
T6  Supabase
    Auth、Postgres、RLS、RPC、private Storage
```

Professor 相關目前實體路徑：

| Layer | 路徑 | 目前責任 | 狀態 |
|---|---|---|---|
| Workspace | `app/professor/layout.tsx` | Professor workspace 共用登入／角色邊界 | Existing |
| Page | `app/professor/dashboard/page.tsx` | 讀取可見 Lab、學生與安全 audit summary | Existing |
| Page | `app/professor/labs/[labId]/page.tsx` | Lab 概覽、成員、summary 與管理入口 | Existing |
| Page | `app/professor/labs/[labId]/students/[studentId]/page.tsx` | 安全 Student Detail 與 audit timeline 基礎 | Existing |
| Components | `components/professor/*` | Lab controls、成員管理、學生列表與 detail UI | Existing |
| Components | `components/workspace/ProfessorWorkspaceHome.tsx` | 正式 Professor workspace 展示層與安全 Preview reuse | Existing |
| Authorization | `lib/auth/authorization.ts` | active account、role、workspace redirect | Existing |
| Domain | `lib/labs/*`, `lib/subscriptions/*`, `lib/ai/*` | Lab、subscription、audit domain helpers | Existing |

`/professor` 是 Phase 1 hidden mock demo；`/professor/dashboard` 才是正式 Professor workspace。兩者不可混用。

## 5. Professor 與 Student 關係

主要關係固定如下，不建立 `student.professor_id` 作為主要 ownership：

```text
Professor
   ↓ owns / participates in
Lab
   ↓ scoped by
Lab Membership
   ↓ identifies
Student
```

Professor 透過 Lab context 看到學生。Student 可以建立自己的研究資料；Professor 消費同一個 shared research data layer。不同資料類型的可見性分開判斷：Private Student Data 預設不共享；Shared Audit Data 需要 student consent；Lab Supervision Data 則在明確提交或保存至 Lab supervision context 後，依 active Lab relationship、Lab scope、server authorization、RLS 與 subscription/read-only product rule 判斷。

Admin 是內部 observation role，不因能進入 Professor workspace 就自動取得 Professor membership、private PDF、raw audit 或學生影片活動。

## 6. 核心 Entity 與狀態

| Entity | Status | V1 說明 |
|---|---|---|
| `profiles` | Existing | 使用者 identity 與主要 workspace role |
| `labs` | Existing | Professor supervision container |
| `lab_memberships` | Existing | Lab 內的 professor／assistant／student 關係 |
| `subscriptions` | Existing | Professor Lab subscription 狀態來源 |
| AI audit / shared audit summary | Existing | Student 產生；Professor 只讀安全 summary |
| `weekly_updates` | Planned | Student 的週進度輸入 |
| `meetings` | Planned | Meeting、summary、decision 與 next meeting |
| `meeting_actions` | Planned | Meeting 後的待辦與期限 |
| `research_milestones` | Future / P1 | 長期研究階段與 submission progress |
| `risk_signals` | Derived | 由結構化資料計算，不建立獨立核心表 |
| `attention` | Derived | 由 rule calculation 產生，不建立獨立核心表 |

除非 repo 實際已有，不新增以下核心概念：`projects`、`boards`、`sprints`、`comments`、`chat_messages`、`documents`、`folders`、`notifications`、`alerts`、`professor_students`。若未來確認已有 supporting entity，應維持 supporting entity，不將其升格為 Professor System 核心模型。

## 7. Shared Research Data Layer

Student System 與 Professor System 不建立兩套重複資料：

```text
Student
  ├── Weekly Update
  ├── Meeting Assistant
  ├── Thesis Progress
  └── AI Audit
          ↓
Shared Research Data Layer
  ├── Progress
  ├── Meetings
  ├── Actions
  └── Risk
          ↓
Professor System
```

核心原則：

```text
Student creates data.
Professor consumes supervision data.
```

Professor 端不要求教授重新輸入學生已經輸入的研究資料，也不以 PDF 或 AI 取代結構化研究進度。

`Shared Research Data Layer` 是 logical domain layer，不是一張未來必須建立的 `shared_research_data` 資料表。資料仍由 `weekly_updates`、`meetings`、`meeting_actions`、AI shared summary 與 future milestones 等 domain entities 組成。

## 8. Professor Information Architecture

目標 IA：

```text
/professor
├── /dashboard
├── /labs
│   └── /[labId]
│       ├── overview
│       ├── students
│       │   └── /[studentId]
│       ├── meetings
│       └── progress
└── /attention
```

目前 route 與目標 route 對照：

| Route | 狀態 | 說明 |
|---|---|---|
| `/professor` | Legacy | Phase 1 hidden mock demo；保留，不作正式 workspace |
| `/professor/dashboard` | Existing Route | 正式 Lab-scoped Professor Workspace |
| `/professor/labs/[labId]` | Existing Route | Lab overview、成員與 summary foundation |
| `/professor/labs/[labId]/students/[studentId]` | Existing Route | Student Detail 與 AI audit timeline foundation |
| `/professor/labs/[labId]/overview` | Planned Route | 未來可拆出的明確 overview route；目前不建立 |
| `/professor/labs/[labId]/students` | Planned Route | 未來可拆出的學生列表 route；目前不建立 |
| `/professor/labs/[labId]/meetings` | Planned Route | Meeting Center；目前不建立 |
| `/professor/labs/[labId]/progress` | Planned Route | Progress view；目前不建立 |
| `/professor/attention` | Planned Route | Attention Center；目前不建立 |

Planned route 不能因文件存在就被視為已實作，也不可在本文件任務中建立。

## 9. Professor Dashboard

Dashboard V1 固定只回答四件事：

```text
Professor Dashboard
├── Needs Attention
├── This Week
├── Upcoming Meetings
└── Students
```

不要將它演變成 20 個 KPI、複雜 analytics、revenue dashboard、Lab ERP 或研究管理 OS。

### Needs Attention V1 rules

本輪只定義規則，不實作：

| 條件 | Derived signal |
|---|---|
| 0–6 天沒有 Weekly Update | 無 signal |
| 7–13 天沒有 Weekly Update | `no_recent_update` |
| >=14 天沒有 Weekly Update | `update_overdue`，取代 `no_recent_update` |
| `meeting_actions.status` 不為 `done`／`canceled` 且 `due_date < today` | `overdue_action` |
| `meeting_actions.status` 不為 `done`／`canceled` 且 `due_date` 在今天至今天 + 14 天 | `deadline_soon` |
| AI risk = high | `high_risk` |
| 最近一次 completed/past Meeting 距今 >=21 天，且沒有 upcoming Meeting | `no_recent_meeting` |

### Attention Signal Precedence

同一學生同一來源的 Weekly Update 缺失，只顯示一個 signal：`update_overdue` 優先於 `no_recent_update`。P0 的 `deadline_soon` 與 `overdue_action` 只來自 `meeting_actions`；`research_milestones` 的 deadline 要等 P1 才能加入。

## 10. Attention 與 Risk

V1 不建立 `alerts`、`notifications` 或 `attention_events` 作為核心表。Attention 是 derived output：

```text
Structured Research Data
        ↓
Rule Calculation
        ↓
Attention Priority
        ↓
Professor Dashboard
```

Risk 不應完全綁定 AI Audit。未來來源可包含 Weekly Update、Meeting、Action Items、Milestones、AI Audit 與 deadline；先採 rule-based，之後才評估 AI-assisted。

## 11. Student Research 360

```text
Student 360
├── Identity
├── Research Status
├── Risk
├── Weekly Progress
├── Meetings
├── Action Items
├── Milestones
└── AI Audit
```

### P0 Student 360

頂部 summary 應回答：Student、Degree、Research Area、Overall Status、Latest Weekly Update、Current Blocker、Next Plan、Next Meeting、Open Action Count、Overdue Action Count、Risk、AI Audit Summary。

### P1 Student 360 Enhancement

`research_milestones` 上線後才增加：Current Stage、Progress Percentage、Research Milestones。P0 不人工製造 percentage，也不由 Weekly Update 猜測進度百分比。

目前 Student Detail 與 AI Audit Timeline 是 **Existing Foundation**，不是本輪重寫目標。Weekly Progress、Meetings、Action Items、Milestones 的完整區塊仍依 Status Matrix 漸進補齊。

## 12. Logical Data Model（不等於資料庫設計）

### Weekly Update — Planned

概念欄位：`id`、`student_user_id`、`lab_id`、`week_start`、`completed_summary`、`blockers`、`next_plan`、`self_status`、`needs_professor_help`、`created_at`、`updated_at`。

`self_status` 概念值：`on_track`、`slightly_behind`、`blocked`。

`needs_professor_help` 概念值：`none`、`next_meeting`、`soon`。

### Weekly Update Invariant

同一個 `lab_id`、`student_user_id`、`week_start` 只能有一份 canonical Weekly Update；使用者可以修改該週內容。V1 不以多筆 update event 作為核心模型。Physical Data Model 階段再決定 unique constraint、upsert 與 history，不在本文件寫 SQL。

### Meeting — Planned

概念欄位：`id`、`lab_id`、`student_user_id`、`meeting_at`、`summary`、`decisions`、`next_meeting_at`、`created_by`、`created_at`、`updated_at`。

流程固定為：

```text
Meeting → Summary → Decision → Action Items → Deadline → Completion
```

Meeting 不能只做成孤立的 Meeting Notes。

### Meeting Action — Planned

概念欄位：`id`、`meeting_id`、`lab_id`、`student_user_id`、`title`、`owner_type`、`owner_user_id`、`due_date`、`status`、`completed_at`、`created_at`、`updated_at`。

`status` 概念值：`todo`、`doing`、`done`、`canceled`。

`owner_type` 概念值：`student`、`supervisor`。V1 不設計複雜 assignee system；一個 Action 只有一個 owner。

- `owner_type = student`：`owner_user_id` 必須等於該 Meeting 的 `student_user_id`。
- `owner_type = supervisor`：`owner_user_id` 必須是該 `lab_id` 中具有 active professor／assistant membership 的 user；Lab owner professor 也合法。

V1 不做 multi-assignee、team assignment、watchers、delegation 或 mention system。若未來要把 Action 指派給其他 professor／assistant，仍以明確的 `owner_user_id` 為單一負責人，不加入複雜 assignee system。

### Research Milestone — Future / P1

概念階段：Research Question、Method、Data / Simulation、Analysis、Figures、Writing、Professor Review、Submission、Revision、Accepted。

它代表 Research Progress，不是 Kanban 或 Jira。

## 13. Data Flow

```text
Student
  ↓
Weekly Update / Meeting Assistant / Thesis Progress / AI Audit
  ↓
Shared Research Data
  ↓
Risk Signals
  ↓
Attention Engine
  ↓
Professor Dashboard
  ↓
Student 360
  ↓
Meeting
  ↓
Action Items
  ↓
Student Execution
  ↓
Next Progress Update
```

AI 必須是最後一層，不是 Professor System 的入口：

```text
Structured Research Data
  ↓
Professor System
  ↓
AI Insight Layer
```

## 14. Status Matrix

| Module | Status | MVP Priority |
|---|---|---|
| Auth | Existing | Foundation |
| Lab | Existing | Foundation |
| Membership | Existing | Foundation |
| Student Detail | Existing | Foundation |
| AI Audit | Existing | Foundation |
| Weekly Update | Planned | P0 |
| Attention Center | Planned | P0 |
| Meeting | Planned | P0 |
| Meeting Actions | Planned | P0 |
| Student 360 Extension | Planned | P0 |
| Milestones | Future | P1 |
| Weekly Brief | Future | P1 |
| Publication Pipeline | Future | P2 |
| AI Professor Assistant | Future | P2 |
| LINE | Future | P2 |

Existing foundation 的具體範圍包含 Professor authentication、正式 Professor Dashboard、Lab、Lab membership、member management、subscription mode、student list、Student Detail、AI Audit summary、AI Audit Timeline 與 Admin read-only observation。

## 15. MVP Boundary

Professor System 第一階段 MVP 是：

1. Weekly Update
2. Attention Center
3. Meeting Center
4. Student Research 360

以下不屬於 MVP：

- Full Kanban
- Gantt
- Lab Chat
- Realtime Chat
- Document Drive
- File Management System
- Full Calendar
- Complex Analytics
- Realtime Monitoring
- LINE Integration
- Publication Pipeline
- AI Professor Assistant
- CRM
- Research Lab OS Full Version
- Complex RBAC
- Multi-tenant SaaS expansion

## 16. Data Classification

### A. Private Student Data

預設 Professor／assistant 不可讀：

- Private PDF
- Raw PDF text
- Storage metadata
- Private prompt
- Private AI conversation
- Raw AI audit
- Token／cost
- Internal error
- Private notes

### B. Shared Audit Data

AI Audit Shared Summary 是 Existing。Professor／assistant 只有在 student consent、指定 Lab scope、server authorization 與 RLS／RPC 均成立時，才能讀取固定欄位的 safe summary。撤回 consent 後下一次查詢必須立即不可見。

### C. Lab Supervision Data

以下是 Planned 的 Lab Supervision Data：

- Student 提交 Weekly Update 給 Lab，屬於 Lab Supervision Data。
- Meeting 被建立並保存為 Lab Meeting，summary、decision、action 屬於 Lab Supervision Data。

Submitting a Weekly Update to a Lab or saving a Meeting into the Lab supervision context is the explicit sharing action for that Lab Supervision Data.

也就是：

```text
加入 Lab
  ≠ 分享私人資料

Submit Weekly Update to Lab
  = 分享這份 Weekly Update

Save Meeting to Lab supervision context
  = 分享這份 Meeting supervision record
```

合法 Lab Professor／assistant 的讀取仍必須經過 active Lab relationship、Lab scope、server authorization、RLS 與 subscription/read-only product rule。Private Student Data 不會因同一個 Lab 就自動變成 Shared Data。

Subscription 只控制產品 access mode，不決定資料是否屬於 Lab Supervision Data：

```text
functional subscription
  → permitted supervision mutations

read_only subscription mode
  → historical permitted supervision data remains readable

no subscription / invalid mode
  → follow existing product authorization rules
```

## 17. Architecture Invariants

1. Professor 透過 Lab／Lab Membership 看到 Student。
2. 不建立 `student.professor_id` 作為主要 ownership。
3. Student 與 Professor 不建立兩套 Research Data。
4. Private Student Data 不因 Lab Membership 自動共享。
5. Weekly Update 提交到 Lab 後屬於該 Lab 的 Supervision Data。
6. Meeting 保存到 Lab supervision context 後屬於該 Lab 的 Supervision Data。
7. AI Audit 仍只有經過 explicit consent 的 Shared Summary 可供 Professor 讀取。
8. Meeting Action 必須有單一明確 `owner_user_id`。
9. Student Action owner 必須為該 Meeting student。
10. Supervisor Action owner 必須屬於該 Lab 的合法 supervisor scope。
11. Attention／Risk V1 為 Derived。
12. Student 360 P0 不依賴 Future Milestones。
13. AI 是 Insight Layer，不是 Core Data Source。

## 18. System Boundary

Professor System 負責：

- Supervision
- Progress Visibility
- Meeting Continuity
- Attention
- Research Follow-up

Professor System 不負責：

- Chat
- File Storage
- General Project Management
- Full LMS
- CRM
- Accounting
- ERP
- Calendar replacement
- Drive replacement
- Slack replacement
- Notion replacement

## 19. 實作與安全規則

- Professor 只看自己擁有或 active membership 所屬的 Lab。
- Student、Professor、assistant 的 Lab scope 必須由 server authorization、RLS、RPC 與 consent 共同保護，不能只靠前端過濾。
- Professor／assistant 不可直接讀 private PDF、raw audit、prompt、token/cost 或 error message；只能讀學生明確同意且尚未撤回的安全 summary。
- Admin observation 不等於 impersonation，也不會自動授予 private data 權限。
- Professor 不查看學生影片觀看或完成紀錄。
- Subscription 失效後，既有 Professor 歷史資料依產品規則進入唯讀，不得新增管理 mutation。
- AI 只作為結構化研究資料之上的 insight layer，不取代 Student、Meeting 或 Professor 的核心責任。

## 20. 本文件任務範圍

本文件只完成 logical architecture documentation：

- 不建立 `weekly_updates`、`meetings`、`meeting_actions` 或其他資料表。
- 不新增 migration、RLS、RPC、index 或 trigger。
- 不修改 Professor、Student、Admin 或共用元件程式。
- 不修改付款、OAuth、AI provider、Storage 或 Production 設定。
- 不把 Planned／Future 功能宣稱為 implemented。

下一階段若要進入 Physical Data Model，必須另開任務，先確認 schema、RLS、consent、寫入邊界與測試策略。
