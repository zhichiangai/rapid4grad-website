# RAPID4GRAD Course Learning Center V1 / Admin Course Studio V1

## Release Scope

本輪建立學生課程學習中心與 Admin 課程內容工作台，重用既有 `courses`、`course_lessons`、`course_progress` 資料模型。沒有新增 table、migration、RLS policy、RPC 或課程權限模型；既有 `public_preview`、`lab_basic`、`full_course` access tier 保持不變。

學生入口為 `/learn`，`/dashboard/course` 維持相容性 redirect 至 `/learn`。Student navigation 使用「課程學習」，Dashboard 僅增加一張 compact learning entry，不改動 Research 360 架構。

## Student Learning Center

- 以 `in_progress` 優先，否則選第一個未完成單元，再否則選第一個可見單元，確保 Continue 行為可預期。
- 顯示課程完成數、Module 分組、access label、單元狀態與 `aria-current` 選取狀態。
- 使用既有 playback API 作為授權閘道；Mux 課程回傳短期 signed playback token，HTML5 課程維持已授權的 HTTPS MP4/WebM 播放來源，瀏覽器不接觸 service credential。
- 播放中每 30 秒、暫停與結束時保存 `course_progress`；既有進度會在影片 metadata 載入後安全恢復。
- 提供上一課、下一課、教材連結與完成提示；手機版使用可收合課程目錄，桌面版使用側欄。
- Dashboard 顯示目前課程、完成數與下一個單元，CTA 回到 `/learn`。

## Admin Course Studio

Admin route：`/admin/course`。頁面與 Server Action 都重新驗證 active Admin，課程與單元查詢使用既有 admin server pattern；service credential 不會進入 browser bundle。

可建立或編輯課程單元：title、slug、module、description、access level、video provider、video source、material URL、sort order、published。Mux 為建議 provider，資料庫只保存不透明的 Playback ID；HTML5 為備用 provider，影片來源只接受 HTTPS MP4/WebM。本輪不提供 hard delete，發布仍由既有 `is_published` 控制。另提供 `/admin/course/preview` 靜態預覽，不會取得影片來源、簽章 token，也不會寫入觀看進度。

## Mux 操作 SOP

1. 在 Mux Dashboard 上傳並等待影片處理完成，確認 Playback Policy 使用 signed playback。
2. 複製影片的 Playback ID，不要複製播放 URL、JWT 或任何 signing secret。
3. 在 Admin Course Studio 選擇「Mux Video（建議）」，將 Playback ID 貼到 Mux 欄位，先儲存草稿，再用預覽確認課程內容，確認後才發布。
4. 播放時由既有 `/api/course/lessons/[lessonId]/playback` 依登入者權限簽發短期 token；token 與 signing key 不寫入資料庫、不進入文件、不暴露給 Admin client。

本輪不做 Mux Direct Upload、webhook、asset status sync、播放量同步或自動化媒體管理。Mux server-only signing environment 只應配置在隔離的 Preview 環境；本輪沒有修改任何 Vercel environment variable，也沒有將 secret 寫入 repository。

## Security And Data Boundaries

- Student catalog/progress 使用 authenticated Supabase client 與既有 RLS。
- Admin mutation 只在 `requireAdminContext` 成功後執行，並使用既有 server-only admin client pattern。
- Browser 不可指定或覆寫 student progress 的授權身份；播放授權由既有 API 驗證。
- 本輪未修改 private data、subscription、billing、permission foundation、RLS、migration 或 Production data。

## Validation

- Contract tests cover deterministic resume, progress persistence, module navigation, mobile curriculum, dashboard entry, Admin guard, Mux/HTML5 provider validation, server-only signing boundary, Preview no-playback behavior, no-delete rule and no browser service credentials.
- `npm test`、lint、TypeScript、build、`git diff --check` 應於本分支完成後記錄實際結果。
- Local authenticated data mutation QA 需使用 disposable local fixtures；若 local Supabase 不可用，不以 Production account 或 Production data 替代。
- Preview QA 僅檢查 route、runtime、responsive layout、video shell 與 Admin protection；不執行 Production mutation。

## Explicit Exclusions

本輪不做 course backend 重建、付款或 entitlement 改造、YouTube/OEmbed provider、AI 課程生成、留言、測驗、證書、推薦系統、批次發布、hard delete、Production deployment 或 Production fixture。

## Release State

- Feature branch: `course-learning-center-v1`
- Main merge: NOT PERFORMED
- Production: NOT CHANGED
- Preview deployment: 待本輪 branch push 後填入實際 URL、Deployment ID、commit 與 READY 狀態
