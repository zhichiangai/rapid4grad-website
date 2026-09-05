# RAPID4GRAD Thesis Progress Tracker V1

## Status

本文件記錄 `thesis-progress-tracker-v1` 的實作與驗收狀態。這是學生私有的中長期論文導航，不是畢業風險評分、Student 360 或專案管理工具。

## MVP

頁面 `/dashboard/thesis` 顯示固定八個里程碑：研究方向與題目、文獻回顧、研究方法與實驗設計、研究計畫 / Proposal、研究執行與資料收集、分析與結果整理、論文撰寫與修改、口試與畢業準備。每一項可記錄狀態、學生自訂目標日期與最多 1000 字備註。

目前階段依固定順序，以最早的 `blocked`、`in_progress`、`not_started` 優先；全部完成時顯示全部完成。允許里程碑跳順序完成，不加入 AI、通知、依賴、子任務、Gantt 或正式畢業判定。

## Data And Privacy

新增唯一資料表 `public.thesis_milestones`，唯一鍵為 `(student_user_id, milestone_key)`。首次進入不建立八筆 seed；頁面以 canonical definitions 補出未開始狀態，第一次修改才 upsert。

RLS 與欄位 grant 只允許 active student 讀取、新增與修改自己的資料。`student_user_id`、`milestone_key` 等身份欄位不可由 authenticated client 更新；沒有 DELETE policy。Professor、Assistant、Admin 沒有這項 V1 資料的讀取權，資料不送 AI，也不寫入研究內容 log。`completed_at` 由資料庫 trigger 依 status 保持一致。

Migration：`20260831182930_add_thesis_milestones_v1.sql`，已在 Local fresh replay 通過，並已套用至隔離的 `rapid4grad-preview`；Production 未操作。

## Integration And QA

需在空白 Local Supabase replay 全部 migrations 後驗證：student own select/insert/update、cross-student zero、身份欄位不可改、DELETE denied、Professor/Assistant/Admin zero、completed_at consistency、out-of-order completion 與 first-use 8-card rendering。Local fresh replay 與上述 integration fixture 已通過。

自動測試覆蓋 canonical definitions、current stage priority、completed count、out-of-order/all-complete、Server Action identity derivation、no-delete 與 migration/RLS contract；完整 suite `npm test` 115/115、lint、TypeScript、build、diff check 均通過。Local fresh replay 與 `supabase/tests/v2_thesis_progress_integration.sql` 通過，既有 V2 database、Email、course、Professor、PDF pool、Admin suites 亦通過。

Preview authenticated QA 已使用隔離的 `rapid4grad-preview` 完成：首次進入顯示 8 個里程碑與 `0 / 8`，設定狀態、目標日期與備註後重新整理資料仍保留；完成後顯示 `1 / 8`，completed 可重新開啟，blocked 狀態會顯示「目前卡在」摘要。測試資料最後已重設為未開始，未操作 Production。另補上 milestone `expected_updated_at` 的 Server-side optimistic concurrency guard，避免舊頁面覆蓋新資料；contract 與自動驗證已通過。Preview route/runtime 基本檢查通過；本輪未取得 375/768/1440 三個獨立 viewport、鍵盤 focus 與瀏覽器 console 的完整證據，這些仍列為待補人工 QA。

## Explicit Exclusions

本輪不做 Professor UI、分享、comments、attachments、analytics、graduation risk、AI、notifications、calendar、Student 360、Meeting/Attention 修改或 Production 操作。

## Release Record

Branch：`thesis-progress-tracker-v1`

Implementation commit：`41114c8` (`feat(thesis): add thesis progress tracker`)

Preview：`READY`，修正後 deployment `dpl_9rofrYwchPY9xahmdp182d6cd9LM`，URL `https://rapid4grad-website-acdrxzw53-zhichiang-ai-s-projects.vercel.app`，branch `thesis-progress-tracker-v1`，implementation commit `627d680b92e2a33fd7e354534619ac62aa15f1b7`。Preview Supabase `rapid4grad-preview` migration history 18/18，dry-run 顯示 up to date；Google OAuth 與 Auth URL 已設定並完成登入驗證。文件同步後產生的最新 deployment 仍維持 Preview，不代表 Production release。

Production：NOT RELEASED；不得由本任務自動合併或部署。
