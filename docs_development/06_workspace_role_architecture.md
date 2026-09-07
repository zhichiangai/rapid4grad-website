# RAPID4GRAD — Workspace / Role Architecture

> **V2 同步（2026-07-19）**：Workspace role 不等於付費權限。學生完整影片由永久 `course_full` entitlement 決定；Professor Dashboard 與 Lab 基礎影片由有效 Professor Lab subscription 決定；PDF AI 稽核只提供給有效訂閱 Lab。詳細規則見 `08_product_business_model_v2.md`、`09_entitlement_and_access_matrix_v2.md` 與 `10_professor_subscription_and_seat_rules.md`。

> **Lab 管理補充**：每位 Professor 最多擁有一個 active Lab。Lab owner 可將自己 Lab 的 student、assistant 或非 owner professor membership 設為 removed，但不可刪除帳號或個人資料；移除後 Lab 衍生權限及舊 Lab summary consent 立即失效。

## 0. V2 Workspace 與 Lab 作用域

- `/dashboard`：學生個人資料、個人課程與所屬 Lab 團隊功能。
- `/professor/dashboard`：有效訂閱 Lab 的管理入口。
- `/admin`：內部觀察與受控維運，不代表擁有學生個人買斷權限。
- `profiles.role`：主要 workspace 分流。
- `lab_memberships.role`：特定 Lab 內的 owner/professor/assistant/student 作用域。
- 同一帳號的影片、PDF 與 Dashboard 權限必須另查 entitlement、subscription、membership 與 consent，不可只看 `profiles.role`。
- Admin workspace 是內部 control plane；Admin observation 不會自動建立 Professor membership，也不代表 private PDF、raw audit 或完整課程權限。Admin 可進 Professor workspace 驗收，但只能 read-only observation。

### Student Personal Navigation 與 Lab Collaboration V1

學生的研究導航與 Professor/Lab 協作是兩個獨立層次：

- Personal navigation：學生不加入 Lab、沒有有效 Lab subscription，仍可使用 Weekly、Meetings、Actions、Thesis、Graduation Risk、Advisor Profile、AI Navigator，以及符合既有 entitlement 規則的課程學習。
- Lab collaboration：active Lab 與 subscription 只決定 Lab 分享、Lab Meeting、Lab Action、Professor/Assistant 可見性與 PDF AI audit 等協作能力，不是學生管理自己研究的前置條件。
- Personal 與 Lab 功能共用 `/dashboard/weekly-check-in`、`/dashboard/meetings`、`/dashboard/actions`，不建立平行的 personal/lab app。
- Capability orchestration 集中於 `lib/student/capabilities.ts`；它只提供 server-side UI/application state，不取代 server authorization 或 Supabase RLS。

目前 V1 的資料作用域規則：

| 資料 | Personal scope | Lab scope |
|---|---|---|
| Weekly | `lab_id IS NULL`，私人且預設不分享 | `lab_id IS NOT NULL`，依既有 Lab RLS 對教授／assistant 可見 |
| Meeting | `lab_id IS NULL`，僅 student owner 可讀寫 | `lab_id IS NOT NULL`，僅授權 Lab context 可讀寫 |
| Meeting Action | 從 Personal Meeting 繼承 `lab_id IS NULL` | 從 Lab Meeting 繼承 Lab ID，受 active Lab capability 與 RLS 保護 |

Weekly 只有在學生擁有 active functional Lab 時才顯示「分享給 Lab」選項；read-only Lab 不阻擋 Personal Weekly 寫入。Personal Meeting 與 Personal Action 不會因學生加入 Lab 而自動分享，Professor/Assistant 不得透過 Lab dashboard 看到 `lab_id IS NULL` 的 rows。

### Capability 與安全邊界

`StudentCapabilities` 的 `personal.*` 權限在目前 MVP 對 authenticated student 為可用；`lab.*` 則由 active membership、Lab 狀態與現行 subscription helper 統一解析。這個 resolver 是導覽與 UX 的單一來源，不是安全邊界。所有 server actions 仍須從 session 推導 owner/scope，並由 Supabase RLS 重新驗證 student ownership、Lab membership、subscription、active account 與 Professor/Assistant scope。

此架構不新增 Personal billing product，不複製 learner data，也不改變既有 Professor workspace 的 role 分流。若要變更作用域，必須新增 forward-only migration，先完成 Local replay、owner/cross-Lab/RLS tests，再考慮 Production expand-before-deploy。

Admin 的使用者、entitlement、訂閱、席位、PDF 額度及操作稽核規格見 `12_admin_control_plane_v2.md`。

更新時間：2026-09-08

## 1. 現況問題

RAPID4GRAD 目前維持同一套 Next.js app、同一套 Supabase Auth、同一套 Supabase DB。這個方向在 Phase 2 是正確的，短期不需要拆成多個產品或多個登入系統。

真正需要拆清楚的是 UI、route 與登入後 redirect 的 workspace：

- student workspace 是研究生自己的學習、AI 指令與 PDF 稽核工作台。
- professor workspace 是教授查看 Lab、學生進度與 AI audit summary 的工作台。
- admin observation workspace 是公司負責人 / 內部管理者觀察營運資料與驗收功能的工作台。

如果 student、professor、admin 混在同一個 dashboard，會造成使用者迷路，也會讓後續 AI / Codex 修改時誤判權限、導覽與 redirect 規則。

## 2. 短期架構

Phase 2 不新增多身份 schema，也不拆成多個產品或登入系統。現行 `profiles.role`
workspace 分流維持不變；但為了完成 Phase 2 的資料安全、Lab consent、quota 與
Email 驗證防線，會新增必要的 security migration、RLS policy 與
`audit_summary_shares`。這些修補不代表開始實作 Phase 3 的多身份架構。

短期用 `profiles.role` 做 workspace 權限分流：

```text
student:
  available workspaces = ["student"]

professor:
  available workspaces = ["professor"]

admin:
  available workspaces = ["student", "professor", "admin"]
```

目前程式端集中在：

```text
lib/workspace/access.ts
```

此檔案負責：

- `getAvailableWorkspaces(role)`
- `canAccessWorkspace(role, workspace)`
- `getDefaultWorkspacePath(role)`
- `isSafeNextPath(value)`

補充：`assistant` 是 Lab membership role，用於指定 Lab 內的教授協作與 audit
summary 可見性；它不是獨立登入 workspace，也不會改變上述
`profiles.role` 的 student / professor / admin 分流。

## 3. Workspace 權限矩陣

| profiles.role | student workspace | professor workspace | admin workspace | 預設登入 fallback |
|---|---:|---:|---:|---|
| student | yes | no | no | `/dashboard` |
| professor | no | yes | no | `/professor/dashboard` |
| admin | yes | yes | yes | `/admin`，但有 safe `next` 時優先尊重 `next` |

明確規則：

- 有 `next` 時，安全驗證通過就優先尊重 `next`。
- 沒有 `next` 時才使用 role fallback。
- admin 直接進 `/professor/dashboard`：允許，但只能 read-only observation；所有修改回 `/admin` 完成。
- admin 直接進 `/admin`：允許。
- student 直接進 `/professor/dashboard`：導回 `/dashboard`。
- professor 直接進 `/dashboard`：短期維持現有最小改動，允許進入基礎 dashboard；但 professor 的預設登入 fallback 是 `/professor/dashboard`。

## 4. OAuth Redirect 規則

登入流程：

```text
/login?next=...
→ /auth/login?next=...
→ Google OAuth
→ /auth/callback
→ safe next 或 role fallback
```

安全規則：

- `next` 必須是站內相對路徑。
- 允許：`/professor/dashboard`
- 禁止：`https://evil.com`
- 禁止：`//evil.com`
- 判斷函式：`isSafeNextPath(value)`
- `/auth/login` 會使用目前 request origin 組出精確 callback URL：`{origin}/auth/callback`。
- `next` 不放進 Supabase OAuth `redirectTo` query，避免 Supabase Redirect URL allowlist 不匹配後 fallback 到 production Site URL。
- safe `next` 會暫存在 httpOnly cookie `rapid_oauth_next`，由 `/auth/callback` 讀取後刪除。

Preview / Production 規則：

- OAuth callback origin 必須使用目前 request / browser origin。
- 不可用 `NEXT_PUBLIC_SITE_URL` 決定 OAuth callback origin。
- Preview 測試時，callback 必須留在 Preview domain。

## 5. Admin 定位

admin 是公司負責人 / 內部觀察者。

admin workspace 的用途：

- 看 Lead。
- 管理免費額度。
- 編輯 prompt templates。
- 驗收 professor workspace。
- 觀察系統資料與營運狀態。

admin 不是一般 professor，也不是一般 student。admin 可以進 professor workspace 是為了驗收與內部觀察，不代表 admin 是 Lab 的正式教授角色。

安全邊界補充：

- Lab invite 只允許 `student` role 兌換；admin 不可透過 invite 取得 student membership。
- Professor / assistant 的資料可見範圍必須由資料庫 RLS 與目前 active Lab membership 決定，不可只靠頁面 filtering。
- Admin observation access 使用獨立 policy / server guard，不得與 professor policy 混寫成一般 Lab 身份。
- Admin 在 Professor workspace 不得建立邀請碼、修改 membership、指派研究工作或執行其他 Professor 寫入操作。
- 學生的 AI audit summary 預設私人；教授/assistant 只有在學生對指定 Lab 建立且未撤回 consent 時可讀 summary。此 consent 不包含 PDF 本文、檔名、Storage metadata 或下載權限。
- Phase 2 不支援同一帳號同時持有多個產品身份；若未來需要多身份，必須先完成 Phase 3 權限模型決策。

## 6. 未來長期架構

若未來需要真正多身份、多組織、多 workspace 切換，可新增：

```text
user_workspace_roles
```

可能欄位：

- `user_id`
- `workspace`
- `role`
- `scope_id`
- `status`

但 Phase 2 Preview 不做此 schema。短期仍以 `profiles.role` 管控。

未來 workspace switcher 可根據 `getAvailableWorkspaces(role)` 或資料庫 workspace roles 顯示。

## 7. 驗收清單

student：

- `/login` 沒有 `next` 時，登入後 fallback 到 `/dashboard`。
- 直接打 `/professor/dashboard`，未登入時導 `/login?next=/professor/dashboard`。
- student 登入後不可進 `/professor/dashboard`，應導回 `/dashboard`。

professor：

- `/login` 沒有 `next` 時，登入後 fallback 到 `/professor/dashboard`。
- 直接打 `/professor/dashboard`，登入後 allowed。

admin：

- 直接打 `/admin`，allowed。
- 直接打 `/professor/dashboard`，allowed。
- 沒有 `next` 的 callback fallback 到 `/admin`。

Preview OAuth：

```text
/professor/dashboard
→ /login?next=/professor/dashboard
→ /auth/login?next=/professor/dashboard
→ Google
→ Preview /auth/callback
→ Preview /professor/dashboard
```

不可發生：

- Preview OAuth 回 production domain。
- safe `next` 被丟失。
- student 進 professor workspace。
