# RAPID4GRAD — Entitlement And Access Matrix V2

> 狀態：現行功能授權唯一規格
> 本文件定義「角色不是權限，付款狀態也不是單一布林值」。實際授權必須由 entitlement、有效 Lab membership、教授訂閱與學生 consent 共同判斷。

## 1. 核心原則

- `profiles.role` 只用於帳號主要 workspace 分流，不直接代表付費功能。
- `lab_memberships.role` 定義使用者在特定 Lab 內的角色。
- `entitlements` 是個人永久或期限型產品權限的主要來源。
- `subscriptions` 是 Professor Lab 訂閱狀態來源。
- `profiles.is_paid` 與 `course_access` 僅能作舊版相容層，不得作為 V2 Source of Truth。

## 2. 影片存取層級

| Access level | 說明 | 取得方式 |
|---|---|---|
| `public_preview` | 公開試看影片 | 不需登入或付款 |
| `lab_basic` | 教授管理與團隊可看的指定內容 | 有效訂閱 Lab 的 active professor、assistant 或 student |
| `full_course` | 包含更多單元的學生完整課程 | 學生個人買斷或 Lab 學生加購升級 |

影片權限判斷順序：

```text
有 active/perpetual full_course entitlement
→ 全部完整影片

否則，有 active Lab membership 且 Lab subscription 有效
→ lab_basic 影片

否則
→ public_preview 影片
```

## 3. 使用者功能矩陣

| 使用者狀態 | 公開影片 | Lab 部分影片 | 完整影片 | PDF AI 稽核 | Professor Dashboard |
|---|---:|---:|---:|---:|---:|
| 匿名訪客 | 是 | 否 | 否 | 否 | 否 |
| 免費學生帳號 | 是 | 否 | 否 | 否 | 否 |
| 個人買斷學生 | 是 | 否 | 是，永久 | 否 | 否 |
| 有效 Lab 學生 | 是 | 是 | 僅已買斷／升級才有 | 是，依 Lab 額度 | 僅自己的學生頁面 |
| 有效 Lab 教授 | 是 | 是，教授／團隊版本 | 不自動取得學生完整版 | 管理 shared pool，不上傳 | 是 |
| 有效 Lab 助教 | 是 | 是，教授／團隊版本 | 不自動取得學生完整版 | 不上傳 | 限定範圍 |
| 訂閱失效 Lab 成員 | 是 | 否 | 個人已買斷者保留 | 否 | Professor/Admin 可唯讀歷史 |
| Admin | 是 | 否，role 不自動授權 | 否，role 不自動授權 | 不代表 PDF 本文權限 | Admin control plane |

## 4. Entitlement 類型

| Entitlement key | 對象 | 時效 | 用途 |
|---|---|---|---|
| `course_full` | user | 永久 | 完整影片 |
| `course_lab_basic` | Lab membership 衍生 | 跟隨訂閱及 membership | 部分影片 |
| `professor_dashboard` | lab | 訂閱期間 | 教授工作區 |
| `pdf_audit_team` | lab | 訂閱期間與額度內 | 團隊 PDF AI 稽核 |
| `audit_summary_access` | professor/assistant + consent | consent 未撤回期間 | 固定欄位摘要 |

`course_lab_basic` 與 `pdf_audit_team` 不應永久寫成個人權限；它們應動態驗證 Lab subscription 與 membership，避免退訂或移除成員後仍可使用。

## 5. PDF 與摘要安全邊界

- Student 是 private PDF 與完整 AI audit 的 owner。
- Professor/assistant 不因訂閱或 Lab membership取得 PDF 本文。
- 學生只能將指定 audit summary 分享給指定 Lab。
- 分享預設關閉，必須有 `consented_at`，且 `revoked_at` 為空。
- 撤回後下一次查詢立即不可見。
- Summary API/RPC 僅回傳固定安全欄位，不回傳文件路徑或完整結果。
- 每位 student 同一時間只能存在一筆 active Lab membership。
- 只有 active Lab students 可以上傳自己的 PDF 並消耗唯一所屬 Lab 的 shared pool。
- Professor/assistant 不直接上傳 PDF，也不因管理 shared pool 取得 PDF 本文。
- Lab 訂閱失效或學生被移除後，學生仍可查看及刪除自己擁有的 private PDF 與完整稽核結果。
- 學生被移出 Lab 後，該 Lab 的 Professor/assistant 下一次查詢即不可再取得其分享摘要；既有 consent 必須同步撤回或視為失效。

## 6. 權限衝突處理

- 永久 `course_full` 不會因 Lab 退訂而撤銷。
- Lab 退訂會立即停止 `lab_basic`、`pdf_audit_team` 與 Professor Dashboard 操作權。
- Lab 退訂後 Professor Dashboard 僅保留既有 Lab 與安全摘要的唯讀模式，不可新增或修改資料。
- Professor 不得授予或撤銷學生個人買斷 entitlement。
- Admin 可透過受控 server-side 操作修正 entitlement，但一般 client 不可直接寫入。

## 7. 影片進度隱私

- Professor/assistant 不可查看學生影片完成狀態、觀看時間、重播次數或其他觀看活動。
- Lab subscription 只授予內容存取，不授予學生觀看行為監控權。
- Admin 不以一般營運頁面查看個別學生影片活動；若未來需要整體成效統計，應使用去識別化聚合資料。

## 8. 學生研究進度邊界

Professor/assistant 可查看的學生進度僅限：

- 學生主動填寫的研究階段。
- 學生主動填寫的下一步任務。
- 學生明確同意分享給指定 Lab 的 AI 稽核安全摘要。

不得將影片觀看紀錄、private PDF、完整稽核結果、付款資料或未取得 consent 的個人研究內容視為 Professor 可見的學生進度。

## 9. Admin Entitlement 邊界

- Admin 可以查詢 entitlement、付款與訂閱同步狀態。
- Admin 只能透過 server-side 受控操作補發或撤銷 entitlement。
- 補發／撤銷必須填寫原因並寫入 `admin_action_logs`。
- Admin role 本身不會自動產生 `course_full`、`lab_basic` 或 `pdf_audit_team` entitlement。
- Admin 不得將 Lab 衍生權限永久寫入個人帳號以繞過訂閱狀態。
- 完整規格見 `12_admin_control_plane_v2.md`。

## 10. Task 4 播放器與 Server 授權邊界

- 共用觀看入口為 `/learn`；`/dashboard/course` 只保留舊網址相容導向。
- `/learn` 的 Server Component 只查詢 lesson metadata，不查詢或下發 `video_external_id`。
- Client 選擇 lesson 後，必須呼叫 `/api/course/lessons/[lessonId]/playback`。
- Playback Route 使用目前 session 的 Supabase client 查詢 lesson；RLS 查不到即拒絕，不使用 admin client 繞過。
- 匿名 policy 與 authenticated policy 分離。匿名 policy 不得呼叫 entitlement／Lab SECURITY DEFINER helper。
- 目前播放器使用原生 HTML5 `<video controls>`，只接受 HTTPS 或同站 MP4/WebM source；不使用 YouTube iframe。
- `/api/course/progress` 只接受登入使用者，使用 `user.id` 寫入本人進度，並在寫入前再次確認 lesson 仍可見。
- Professor、assistant 與 Admin 沒有讀取其他使用者 `course_progress` 的 policy。

### 播放保護的殘餘風險

Server/RLS 可阻止未授權帳號取得播放來源，但網頁播放器不是完整 DRM。已授權使用者仍可能：

- 使用螢幕錄影保存內容。
- 在播放來源有效期間轉傳 URL。
- 透過瀏覽器開發工具觀察 media request。

因此正式上架前仍需決定影片承載平台與短效簽章策略。UI 與 lesson schema 保持 provider-neutral，未來可切換 private object storage、HLS 或商用 DRM provider，不應重寫 entitlement 與 RLS。
