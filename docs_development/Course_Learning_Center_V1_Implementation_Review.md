# RAPID4GRAD Course Learning Center V1 / Admin Course Studio V1

## UX Consolidation Update

- `/admin/course` now presents a unified lesson workspace: metadata, one-step video selection, upload progress, processing state, preview and draft save stay together.
- Selecting a video for a new lesson creates an Admin-authorized Draft automatically; slug and sort order are generated server-side, so normal Admins do not need to manage either field.
- Mux is the normal provider path. Playback ID, provider choice and legacy HTML5 fallback controls are kept under Advanced settings.
- Upload status polls through an Admin-authorized status endpoint and stops at `ready` or `errored`; the existing replacement safety and server publish gate remain unchanged.
- The desktop Admin sidebar now has an independent scroll region and the mobile menu is constrained to the viewport.
- Automated regression: 143 tests passed, lint passed, TypeScript passed, and production build passed. No migration, RLS, OAuth, credential, webhook, or Production data changes were made in this UX update.

## Release Scope

本輪建立學生課程學習中心與 Admin 課程內容工作台，重用既有 `courses`、`course_lessons`、`course_progress` 資料模型。Direct Upload 只新增狹窄的 course video lifecycle 欄位，不新增 table、不改 RLS policy、RPC 或課程權限模型；既有 `public_preview`、`lab_basic`、`full_course` access tier 保持不變。

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

可建立或編輯課程單元：title、slug、module、description、access level、video provider、video source、material URL、sort order、published。Mux 為建議 provider，Admin 可在 RAPID 直接選檔上傳；資料庫只保存不透明的 Playback ID 與必要 lifecycle metadata。HTML5 為備用 provider，影片來源只接受 HTTPS MP4/WebM。本輪不提供 hard delete，發布的 Mux 單元必須是 `ready` 且有 Playback ID。`/admin/course/preview` 在 ready 時使用 Admin-only playback gateway 試播 draft，未 ready 時維持靜態預覽。

## Mux 操作 SOP

1. 在 Admin Course Studio 建立課程單元草稿，選擇「Mux Video（建議）」。
2. 按「選擇影片」或「替換影片」，影片 bytes 由瀏覽器直傳 Mux，不經 RAPID/Vercel。
3. 等待上傳完成與 Mux webhook 將狀態更新為 `ready`，再使用 Admin-only「試播」確認，最後才勾選發布。
4. 播放時由 server-only playback gateway 依權限簽發短期 token；token、Upload ID、Asset ID 與 signing key 不進入學生 UI、不寫入文件、不暴露給 browser。

Mux Direct Upload、signed webhook 與 asset lifecycle 只更新目前 lesson 的 upload/asset/status 欄位；Replacement 在新 asset ready 前保留舊 Playback ID。舊 Mux asset cleanup、captions、thumbnails、bulk upload、drag reorder 為後續 P1；本輪沒有修改任何 Vercel environment variable，也沒有將 secret 寫入 repository。

## Security And Data Boundaries

- Student catalog/progress 使用 authenticated Supabase client 與既有 RLS。
- Admin mutation 只在 `requireAdminContext` 成功後執行，並使用既有 server-only admin client pattern。
- Browser 不可指定或覆寫 student progress 的授權身份；播放授權由既有 API 驗證。
- 本輪只新增 `20260906100000_course_video_upload_lifecycle.sql` 的三個欄位與狀態 constraint，未修改 private data、subscription、billing、permission foundation、RLS 或 Production data。

## Validation

- Contract tests cover deterministic resume, progress persistence, module navigation, mobile curriculum, dashboard entry, Admin guard, Mux/HTML5 provider validation, server-only signing boundary, Preview no-playback behavior, no-delete rule and no browser service credentials.
- `npm test`、lint、TypeScript、build、`git diff --check` 應於本分支完成後記錄實際結果。
- Local authenticated data mutation QA 需使用 disposable local fixtures；若 local Supabase 不可用，不以 Production account 或 Production data 替代。Mux signed playback 的真實端到端播放仍需配置隔離 Preview Mux environment 與安全測試 asset，不能以 Production secret 或 Production data 替代。
- 本輪 Preview QA 已確認 build、`/learn` 公開 route、Admin protection 與 runtime errors；沒有安全 Preview 登入帳號，因此 authenticated course playback/progress mutation QA 記為 NOT EXECUTED，不視為 Production blocker。

## Direct Upload QA Gate

- Contract coverage: Admin-only Direct Upload URL、browser-to-Mux boundary、signed playback policy、lesson metadata link、webhook signature、asset lifecycle、stale replacement protection、publish ready gate。
- Authenticated Preview upload QA: NOT EXECUTED — 尚未配置安全的 Preview-only Mux credentials、webhook secret 與測試 asset。
- Production: unchanged; no Production environment variables, database migration, user data or video asset operations were performed。

## Explicit Exclusions

本輪不做 course backend 重建、付款或 entitlement 改造、YouTube/OEmbed provider、AI 課程生成、留言、測驗、證書、推薦系統、批次發布、hard delete、Production deployment 或 Production fixture。

## Release State

- Feature branch: `course-learning-center-v1`
- Main merge: NOT PERFORMED
- Production: NOT CHANGED
- Preview deployment: `https://rapid4grad-website-l4usbh6k2-zhichiang-ai-s-projects.vercel.app`
- Preview deployment ID: `dpl_2v8dX1uVbjNmc2ec1gSt5z389Ey9`
- Preview commit: `8def25d995e8f852ddca198f36b3c3633c100060`
- Preview state: READY
- Preview target: Preview（未部署 Production）
