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

需在空白 Local Supabase replay 全部 migrations 後驗證：student own select/insert/update、cross-student zero、身份欄位不可改、DELETE denied、Professor/Assistant/Admin zero、completed_at consistency、out-of-order completion 與 first-use 8-card rendering。18/18 migrations fresh replay 已通過。修正後的 `supabase/tests/v2_thesis_progress_integration.sql` 先提交 Student A 的 `research_direction` 與 Student B 的 `literature_review` 真實資料，再執行隔離檢查：Student A 僅見自己的 row、Student B 僅見自己的 row，Professor/Assistant/Admin 在兩筆資料存在時皆為 0 rows，跨學生與 staff mutation 均被拒絕，最後完成 cleanup。

自動測試覆蓋 canonical definitions、current stage priority、completed count、out-of-order/all-complete、Server Action identity derivation、no-delete、migration/RLS contract，以及不可用空資料誤判隱私隔離的 fixture contract；完整 suite `npm test` 116/116、lint、TypeScript、build、diff check 均通過。Thesis fixture 與既有 V2 database、Email、course、Professor、PDF pool、Admin suites 均在各自 fresh Local replay 通過；串接共用資料庫不作為驗收方式，以避免固定 fixture email 互相污染。

Preview authenticated QA 已使用隔離的 `rapid4grad-preview` 完成：首次進入顯示 8 個里程碑與 `0 / 8`，設定狀態、目標日期與備註後重新整理資料仍保留；完成後顯示 `1 / 8`，completed 可重新開啟，blocked 狀態會顯示「目前卡在」摘要。測試資料最後已重設為未開始，未操作 Production。另補上 milestone `expected_updated_at` 的 Server-side optimistic concurrency guard，避免舊頁面覆蓋新資料；contract 與自動驗證已通過。Preview route/runtime、375/768/1440 viewport overflow、keyboard traversal 與 `:focus-visible` 檢查通過，首頁及已登入學生頁 console 無 error/warn。

## Explicit Exclusions

本輪不做 Professor UI、分享、comments、attachments、analytics、graduation risk、AI、notifications、calendar、Student 360、Meeting/Attention 修改或 Production 操作。

## Release Record

Branch：`thesis-progress-tracker-v1`

Implementation commit：`c543c32` (`test(thesis): harden thesis privacy isolation fixtures`)；此前功能與 concurrency commits `41114c8`、`627d680` 保留。

Preview：`READY`，本輪 deployment `dpl_A1ZQ6VzU8SSo9pc9PoxmkdR8Qwsw`，URL `https://rapid4grad-website-r98rthfkq-zhichiang-ai-s-projects.vercel.app`，branch `thesis-progress-tracker-v1`，commit `c543c328a57853c46c5052eae87c8912d7958289`。Preview Supabase `rapid4grad-preview` migration history 18/18，dry-run 顯示 up to date；本輪未修改雲端設定。此 Preview 仍不代表 Production release。

## Production Release

- Source branch `thesis-progress-tracker-v1` 已以 fast-forward 合併至 `main`，merged SHA：`003c7f65a1116f2c8fb471c99ea9c436958f26f8`。
- Production Supabase `rapid4grad-v2`（ref `ktfvscyxsdrcrbaemlbl`）已套用唯一 Thesis migration `20260831182930_add_thesis_milestones_v1.sql`。Migration history 為 19/19，dry-run 顯示 up to date。
- Production schema read-back：`public.thesis_milestones` 存在，欄位、RLS 與預期三個 student-own policies 正確；authenticated DELETE 為 denied，identity 欄位不可更新；未建立任何 Production row 或 QA user。
- Production Vercel deployment `dpl_7LdigHq5L5vWR1RNc6h5sCFyw6gf`，commit `003c7f65a1116f2c8fb471c99ea9c436958f26f8`，target `production`，狀態 `READY`；正式網址：`https://www.rapid4grad.com`。
- Anonymous smoke：首頁、Thesis、Actions 與 Professor protected routes 通過，無 HTTP 500 或 redirect loop。Authenticated Production smoke 未執行，因沒有安全專用 Production session；Local/Preview authenticated QA 已完成。
- Production schema mutation：YES，僅核准的 Thesis additive migration。Production Thesis row、user、Lab、membership、subscription、Meeting、Action mutation：NONE。
- Thesis Progress Tracker V1：`PRODUCTION READY — FROZEN`。不在本版本加入 Professor sharing/editing、custom milestones、AI、通知、Gantt 或 graduation prediction。
