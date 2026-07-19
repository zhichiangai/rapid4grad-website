# RAPID4GRAD

RAPID4GRAD 是研究生課程、Professor Lab 管理與團隊 PDF AI 稽核平台。

## AI / 開發者必讀順序

修改產品、付款、影片、Professor Dashboard、Lab、PDF AI 稽核或資料庫前，必須依序閱讀：

1. `/Users/fengfeng/rapid 本機開發/readme_project.md`
2. 程式分層與路由：`docs_development/01_project_directory_structure.md`
3. `docs_development/08_product_business_model_v2.md`
4. `docs_development/09_entitlement_and_access_matrix_v2.md`
5. 教授／Lab 功能：`docs_development/10_professor_subscription_and_seat_rules.md`
6. 資料庫重建：`docs_development/11_database_baseline_v2_plan.md`
7. 系統管理者：`docs_development/12_admin_control_plane_v2.md`
8. Workspace：`docs_development/06_workspace_role_architecture.md`
9. 歷史驗收：`docs_development/phase2_release_checklist.md`

## 現行產品決策

- 學生完整課程採一次性買斷。
- 有效 Professor Lab 成員可觀看部分指定影片。
- Lab 學生可加購並永久解鎖完整影片。
- Professor Dashboard 採訂閱制：Standard 0–15 位、Plus 0–30 位（第 16 位前須升級）、31 位以上人工洽談。
- Standard 與 Plus 都支援月繳、年繳，並提供一次 30 天免綁卡試用；正式價格尚待公告。
- `past_due` 提供 15 天功能寬限，寬限後 Professor workspace 轉為唯讀。
- Professor 是付款人，subscription 綁定自己建立的 Lab且不轉移。
- 每位 Professor 最多擁有一個 active Lab，每個 Lab 同時只能有一筆有效 subscription，並最多 3 位 active assistants。
- 每位學生同一時間只能加入一個 active Lab。
- 平台內 PDF AI 稽核只提供給有效訂閱 Professor Lab 的 active students；Standard 每月共用 30 次、Plus 每月共用 100 次，按月重設且不結轉。
- 學生個人課程買斷不包含 PDF AI 稽核。
- Professor/assistant 不得直接讀學生 private PDF 或 raw audit，只能讀取學生明確同意分享的安全摘要。
- Admin 是內部營運控制台；敏感權限異動必須經 server-side 操作並留下 action log，且預設不可讀 private PDF 或 raw audit。
- Professor/assistant 不查看學生影片觀看或完成紀錄；訂閱失效後 Professor Dashboard 只保留唯讀歷史。
- Lab owner 可移除自己 Lab 的 student、assistant 與非 owner professor；移除採 membership 狀態變更，不刪除帳號、私人 PDF 或歷史稽核資料。

## 歷史文件規則

`/Users/fengfeng/rapid 本機開發/RAPID4GRAD_舊版本產品規劃/`、舊 Phase 1/2 playbook 與 release checklist 保存歷史決策及實作紀錄，不是現行商業模式的 Source of Truth。

若歷史文件出現以下規格，不得直接採用：

- NT$ 2,400 課程加 6 個月個人工具。
- NT$ 890 / 6 個月學生續約。
- `student_monthly` 或 `student_semester` 訂閱。
- 個人學生訂閱即可使用平台內 PDF AI 稽核。
- Professor Dashboard 只是 hidden demo。

## 開發狀態提醒

V2 文件目前是產品決策，不代表程式與 Supabase schema 已完成改造。任何實作前必須先確認現況、影響範圍與驗收方式，不可直接刪除既有資料庫或 Phase 1 fallback。
