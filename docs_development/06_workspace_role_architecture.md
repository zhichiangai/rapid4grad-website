# RAPID4GRAD — Workspace / Role Architecture

更新時間：2026-07-11

## 1. 現況問題

RAPID4GRAD 目前維持同一套 Next.js app、同一套 Supabase Auth、同一套 Supabase DB。這個方向在 Phase 2 是正確的，短期不需要拆成多個產品或多個登入系統。

真正需要拆清楚的是 UI、route 與登入後 redirect 的 workspace：

- student workspace 是研究生自己的學習、AI 指令與 PDF 稽核工作台。
- professor workspace 是教授查看 Lab、學生進度與 AI audit summary 的工作台。
- admin observation workspace 是公司負責人 / 內部管理者觀察營運資料與驗收功能的工作台。

如果 student、professor、admin 混在同一個 dashboard，會造成使用者迷路，也會讓後續 AI / Codex 修改時誤判權限、導覽與 redirect 規則。

## 2. 短期架構

Phase 2 Preview 不新增 table、不改 RLS、不新增多身份 schema。

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

## 3. Workspace 權限矩陣

| profiles.role | student workspace | professor workspace | admin workspace | 預設登入 fallback |
|---|---:|---:|---:|---|
| student | yes | no | no | `/dashboard` |
| professor | no | yes | no | `/professor/dashboard` |
| admin | yes | yes | yes | `/admin`，但有 safe `next` 時優先尊重 `next` |

明確規則：

- 有 `next` 時，安全驗證通過就優先尊重 `next`。
- 沒有 `next` 時才使用 role fallback。
- admin 直接進 `/professor/dashboard`：允許。
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
