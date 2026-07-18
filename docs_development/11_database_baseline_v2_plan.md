# RAPID4GRAD — Database Baseline V2 Plan

> 狀態：V2 Local baseline 已建立並通過空白 Local Supabase replay 與整合驗收。
> 新 baseline 尚未套用任何遠端 Supabase Project；不得直接對既有 Production 執行。
> 更新日期：2026-07-19

## 1. 重建目標

因專案尚未正式上線、沒有需要保留的真實使用者與重要營運資料，可評估以全新 Supabase Project 建立乾淨 Baseline V2。舊 Project 應先保留作回復點，不直接 `DROP SCHEMA`。

V2 需要解決：

- 兩份 `002` migration 編號衝突。
- Phase 1 `course_access` / `profiles.is_paid` 與新版 entitlement 重疊。
- 學生訂閱與 Professor Lab 訂閱混合。
- PDF AI 稽核由個人訂閱改成有效 Professor Lab 團隊功能。
- RLS helper 與修補 migration 分散。

## 2. 建議 Baseline 001–007

| Migration | 單一責任 |
|---|---|
| `001_extensions_and_shared_functions.sql` | extensions、timestamps、共用安全 helper |
| `002_phase1_core.sql` | profiles、leads、quiz、prompt builder fallback |
| `003_products_payments_and_entitlements.sql` | products、orders、payments、個人永久 entitlement |
| `004_courses_lessons_and_progress.sql` | 課程、影片分級、觀看進度 |
| `005_labs_subscriptions_and_seats.sql` | Lab、memberships、invite、教授方案與席位 |
| `006_documents_ai_audit_and_consent.sql` | private PDF、audit、Lab credits、summary consent |
| `007_grants_rls_storage_and_seed.sql` | RLS、Storage policies、grants、最小 seed |

實體 SQL 位於 `supabase/migrations/`。舊 Phase 1/2 migration 原檔完整保留於
`supabase/migrations_legacy/`，只供歷史追蹤，不參與新 V2 空白資料庫 replay。

## 3. Source of Truth

- 個人完整影片：`entitlements`。
- Professor Lab 功能：有效 `subscriptions` + Lab plan。
- Lab 部分影片：有效 subscription + active membership。
- PDF AI 稽核：Lab subscription + Lab credits + active student membership。
- Summary 可見性：Lab relationship + explicit consent。
- `profiles.is_paid` 與舊 `course_access` 先保留為相容層，但不作為 V2 Source of Truth。
- Professor subscription 的 payer 是 Professor user，授權對象是該 Professor 自己建立且擁有的單一 Lab；不支援 subscription 或 Lab owner 轉移。

## 4. 建議核心資料模型

- `products`：學生買斷、Lab 學生升級、Professor Standard/Plus/Enterprise plans。
- `orders` / `payments`：一次性購買與付款紀錄。
- `entitlements`：永久 `course_full` 等個人權限；永久買斷以無到期時間表示。
- `courses` / `course_lessons`：影片內容與 `public_preview`、`lab_basic`、`full_course` 分級。
- `labs` / `lab_memberships`：Lab 與作用域角色；同一 Professor 最多擁有一個 active Lab，同一 student 同一時間只能有一筆 active Lab membership，每個 Lab 最多 3 位 active assistants。
- `subscriptions` / `subscription_items`：Professor payer、綁定 Lab、Standard/Plus/Enterprise 方案與狀態。
- `lab_usage_credits`：Lab shared PDF pool，只有 active students 可消耗，取代個人訂閱式 PDF eligibility。
- `student_documents` / `ai_audit_jobs` / `ai_audit_results`：學生私有內容。
- `audit_summary_shares`：指定 Lab、可撤回的摘要 consent。
- `admin_action_logs`：Admin 對帳號、entitlement、Lab、subscription 與 credits 的敏感操作稽核紀錄。

`admin_action_logs` 只能由受控 server-side admin 操作寫入；一般 client 不可 INSERT、UPDATE 或 DELETE。紀錄只保存必要 before/after state，不保存 secret、完整 PDF、raw prompt 或其他不必要敏感內容。

## 5. 重建流程

1. **已完成**：凍結並封存既有 migrations，不直接改名。
2. **已完成**：依最終產品規則撰寫 Baseline V2。
3. **已完成**：在空白 Local Supabase 重播 001–007。
4. **已完成**：執行角色、RLS、席位並行、PDF 隔離與 entitlement integration tests。
5. **待人工決策**：建立新的 Supabase Project。
6. **待明確授權**：套用 Baseline V2 並建立 private buckets。
7. **待外部設定**：設定 Auth、Google OAuth 與 Preview env。
8. **待驗收**：Preview 完整驗收後才切換 Production。
9. **待未來處理**：舊 Project 保留到回復期結束後再封存。

## 6. 明確禁止

- 未完成本機驗收前清除舊 Supabase Project。
- 將舊 `002_payment_service_foundation.sql` 直接改名為 `007`。
- 直接對現有 Production 執行全套新 baseline。
- 以 `profiles.is_paid` 判斷所有影片、Lab 與 PDF 權限。
- Professor/assistant 直接讀取 private PDF 或 raw audit tables。
- 同一 student 同時存在多筆 active Lab memberships。
- Standard 第 16 位或 Plus 第 31 位 student 在未升級前建立 membership。

## 7. 建立 SQL 前仍需決策

- 所有價格與方案週期。
- Large plan 人數上限。
- 課程與 lesson 分級清單。
- PDF 額度、超額費與失敗退款規則。
- 訂閱到期後的資料保留政策。
- Payment provider 及 recurring billing provider。
- Admin action 類型、客服補償上限與未來內部角色分級。
- Legacy `profiles.is_paid` / `course_access` 最終移除時間；目前先保留相容。

## 8. V2 必要資料庫不變量

- 每個 Lab 只有一位 owner Professor 與一筆當期有效 subscription。
- 每位 Professor 全系統最多擁有一個 active Lab。
- Subscription 保存 `payer_user_id` 與 `lab_id`，且 payer 必須是該 Lab owner。
- Subscription 與 Lab owner 不轉移；新 Professor 建立新 Lab 與新 subscription。
- 每位 student 全系統最多一筆 active Lab membership。
- Standard 最多 15 位 active students，Plus 最多 30 位；加入與席位判斷必須同一 transaction 完成。
- 每個 Lab 最多 3 位 active assistants；assistant 加入或角色變更也必須由資料庫不變量限制。
- 移除 Lab 成員採 membership 狀態轉換，不硬刪除歷史；學生被移除時，對舊 Lab 的有效 summary consent 必須在同一受控流程中撤回或失效。
- Lab 失效或 membership 結束不影響學生 owner 讀取及刪除自己的 private PDF 與完整 audit result。
- PDF reserve/settle/refund 只操作 student 唯一 active Lab 的 shared pool。
- 只有 active student 可建立新的 PDF audit job；Professor/assistant 不直接消耗 shared pool。
- Professor subscription 失效後，寫入操作與新 PDF audit 停止，只允許既有安全資料唯讀。
- Lab student 優惠只驗證付款當下的 active membership，不設定最低加入天數。

## 9. Local 驗收紀錄（2026-07-19）

已通過：

- 空白 Local Supabase 依序 replay `001` 至 `007`。
- authenticated 只能更新 profile 基本欄位，不能更新 role 或付款相容欄位。
- `free_usage_quotas` 對 anon/authenticated 無直接讀寫權限。
- 每位 Professor 一個 active owned Lab、每位 student 一個 active Lab、每個 Lab 一筆當期 subscription。
- Standard 方案兩個並行加入請求爭最後一席時，只允許一位成功，invite `used_count` 只增加一次。
- PDF shared pool 的 reserve、settle、refund 皆具冪等結果，不重複扣額度。
- Professor/assistant 對 private PDF metadata、Storage object、raw audit jobs/results 均不可讀。
- 同 Lab 且 consent 有效時只能經七欄 summary RPC 讀取；cross-Lab 與 revoke 後回傳零筆。
- Lab member removal 使用狀態轉換，並在同一 transaction 使舊 Lab summary consent 失效。
- 永久 `course_full` entitlement 無到期日，且不因退出 Lab 而失效。

驗收入口：

- SQL fixture：`supabase/tests/v2_database_integration.sql`
- 本機執行器：`scripts/test-v2-database.sh`
- 靜態安全 contract：`tests/v2-database-baseline-contract.test.ts`
- 由 Local schema 產生的獨立型別：`types/database-v2.generated.ts`

仍未完成：新 Supabase Project、遠端 migration、Auth/OAuth、Vercel Preview、付款 provider、
真實 AI provider 與 Production 切換。以上不得因 Local 驗收通過而標記為已上線。
