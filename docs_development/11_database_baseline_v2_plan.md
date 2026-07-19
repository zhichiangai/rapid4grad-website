# RAPID4GRAD — Database Baseline V2 Plan

> 狀態：V2 Local baseline 已建立；Task 3 學生一次性買斷、Task 4 三層影片 RLS、Task 5 Professor subscription／trial／seats extension 均已通過空白 Local Supabase replay 與整合驗收。
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
- 同一 student 被兩個不同 Lab 同時邀請時，只允許一筆 active membership，失敗 transaction 不增加 invite `used_count`。
- Standard 方案兩個並行加入請求爭最後一席時，只允許一位成功，invite `used_count` 只增加一次。
- PDF shared pool 的 reserve、settle、refund 皆具冪等結果，不重複扣額度。
- Professor/assistant 對 private PDF metadata、Storage object、raw audit jobs/results 均不可讀。
- 同 Lab 且 consent 有效時只能經七欄 summary RPC 讀取；cross-Lab 與 revoke 後回傳零筆。
- Lab member removal 使用狀態轉換，並在同一 transaction 使舊 Lab summary consent 失效。
- 永久 `course_full` entitlement 重送授權仍只有一筆、無到期日，且不因退出 Lab 而失效。
- 受控 Admin mutation 會寫入 `admin_action_logs`，一般 client 無直接 mutation grant。

驗收入口：

- SQL fixture：`supabase/tests/v2_database_integration.sql`
- 本機執行器：`scripts/test-v2-database.sh`
- 靜態安全 contract：`tests/v2-database-baseline-contract.test.ts`
- 由 Local schema 產生的獨立型別：`types/database-v2.generated.ts`

仍未完成：新 Supabase Project、遠端 migration、Auth/OAuth、Vercel Preview、正式付款 provider、
正式學生價格、真實 AI provider 與 Production 切換。以上不得因 Local 驗收通過而標記為已上線。

## 10. Task 3 學生一次性買斷（Local closure）

新增 migration：

- `20260718222430_student_one_time_course_purchase.sql`

此 migration 不修改 Baseline `001`–`007`，只補上學生課程買斷所需的原子交易邊界：

- `create_student_course_checkout_order(...)`：由 server/service role 建立或重用 pending order；商品、價格與 Lab 優惠資格都由資料庫決定，不接受 Client 宣稱。
- `process_one_time_payment_event(...)`：在同一 transaction 內處理 payment event idempotency、付款紀錄、訂單狀態與永久 `course_full` entitlement。
- 同一 provider event 重送不重複建立 payment、event 或 entitlement。
- 已持有永久 `course_full` 的使用者不能重複建立新買斷訂單。
- 付款失敗或取消不開通 entitlement。
- 退款／拒付只標記付款與訂單狀態，由 Admin 人工審核；目前不自動撤銷永久 entitlement。
- Lab 優惠只在建立訂單當下驗證 active student membership 與 Lab 有效 subscription；離開 Lab 不影響已取得的永久權限。

本機 provider 與價格邊界：

- `PAYMENT_PROVIDER=test` 只用於 Local integration，不收取真實款項，且 Production runtime 明確禁用。
- `PAYMENT_TEST_SECRET` 只放本機環境，使用 HMAC 簽章 checkout token；不得進 Git 或 Client bundle。
- 正式商品價格尚未決定；沒有 active `product_prices` 時，`/course` 顯示「價格待公告」且 checkout disabled。
- 尚未實作 ECPay、NewebPay、TapPay 或 Stripe 的 V2 一次性付款 provider，不能把本機 closure 宣稱為正式金流已完成。

Task 3 Local 驗收：

- 空白 Local Supabase replay Baseline `001`–`007` 與 Task 3 migration 成功。
- Standard buyer 與有效訂閱 Lab student 分別選取正確 server-side price row。
- 成功付款只建立一筆 payment、一筆 payment event 與一筆無到期日 `course_full` entitlement。
- webhook 重送與並行重送維持 idempotent。
- 付款失敗、取消與退款人工處理規則符合預期。
- order SELECT 受 owner RLS 隔離，其他使用者無法讀取。

驗收入口：

- SQL fixture：`supabase/tests/v2_student_course_purchase_integration.sql`
- 本機執行器：`scripts/test-v2-student-course-purchase.sh`
- Token tests：`tests/payment-test-provider-token.test.ts`
- Static contract：`tests/v2-student-course-purchase-contract.test.ts`

## 11. Task 4 三層影片存取（Local closure）

沿用 Baseline `004_courses_lessons_and_progress.sql` 的資料模型：

- `courses`：課程容器與發布狀態。
- `course_lessons`：模組、排序、顯示 metadata、`video_provider`、`video_external_id` 與三層 `access_level`。
- `course_progress`：只屬於使用者本人的觀看進度；Professor/assistant/Admin 無跨使用者 SELECT policy。

新增 migration：

- `20260719073736_split_course_lesson_access_policies.sql`

此 migration 修正 Baseline 合併 policy 的匿名查詢缺口：

- `course_lessons_select_public_preview` 只判斷已發布的 `public_preview`，不呼叫 authenticated-only helper。
- `course_lessons_select_authenticated_access` 才呼叫永久 `course_full` 與動態 Lab access helper。
- 不授權 anon 執行 `has_active_course_full` 或 `has_lab_basic_access`，避免匿名探測其他帳號權限。
- 買斷學生能讀三層 lesson；active Lab professor/assistant/student 只能多讀 `lab_basic`；訂閱到期或 membership 結束後立即回到 public preview。
- Admin role 本身不產生課程權限，只能讀 public preview。

正式內容狀態：

- Baseline 只有一個未發布的 `rapid4grad-core` course 容器，沒有正式 lesson。
- 真實影片分類、HTML5 media source 與教材 URL 仍待使用者提供，不在 migration seed 放置假影片。
- Local integration 使用 `media.local.test` fixture，只驗證 RLS，不代表正式影音 hosting 已設定。

驗收入口：

- SQL fixture：`supabase/tests/v2_course_content_access_integration.sql`
- 本機執行器：`scripts/test-v2-course-content-access.sh`
- Static contract：`tests/v2-course-content-access-contract.test.ts`

## 12. Task 5 Professor Subscription And Seats（Local closure）

新增 migration：

- `20260719082208_professor_subscription_and_trials.sql`

本 migration 不修改 Baseline `001`–`007`，只擴充：

- `subscriptions` 的 `trial_started_at`、`trial_ends_at` 與 `grace_ends_at`。
- `professor_subscription_trials`，以 payer unique constraint 保證一個教授帳號只能領取一次 30 天免綁卡試用。
- `orders.lab_id` 與 `orders.subscription_id`，讓正式付款單可追溯到 Professor Lab subscription。
- service-role-only 的試用、checkout order、verified event 與取消 RPC。
- Standard 15／Plus 30 席位與 3 位 assistant 仍由資料庫 trigger 執行。
- `past_due` 在 15 天內仍視為 functional；寬限結束、`unpaid`、`canceled`、`expired` 轉為唯讀。
- 同秒 provider event 由較嚴格狀態優先；event ID 與 provider payment ID 保持 idempotent。

付款與價格邊界：

- Standard／Plus 均支援 month/year price row。
- 正式 provider 暫定 ECPay；CheckMacValue 已用綠界官方 SHA-256 範例驗證。
- 綠界取消 API 使用官方 `Cashier/CreditCardPeriodAction`，並驗證回傳 CheckMacValue、Merchant ID 與 MerchantTradeNo。
- 綠界沒有自動改價／換方案 API；既有付費訂閱不可自助建立第二筆定期扣款，Standard／Plus 或月年週期變更先走客服受控流程。
- 30 天試用由 RAPID4GRAD 自己管理，不以 ECPay 建立 0 元定期訂單。
- 正式價格仍待公告；沒有 active ECPay `product_prices` 時，checkout 必須 disabled。
- PDF 額度仍待定；Task 5 不建立 `lab_usage_credits`，Task 7／Admin 後台再處理 shared pool 數值。

Local 驗收：

- 空白 Local Supabase replay 成功。
- 同一教授第二次試用、第二個 active owned Lab、同 Lab 第二筆 current subscription 均被拒絕。
- Standard 第 16 位被拒；受控變更為 Plus 後可加入。既有付費方案的自助換方案會被拒，避免兩筆綠界扣款並存。
- Checkout idempotency retry 會回傳相同 order 與完整 provider payload，不會建立第二筆訂單。
- 月繳與年繳只使用 active DB price，不使用環境變數或假金額。
- Webhook 重送只建立一筆 payment；同秒較寬鬆狀態不能覆蓋 `past_due`，較新的成功事件可恢復 active。
- 取消正式訂閱會停止後續續訂並保留目前已付款週期；取消試用則立即停止。
- Task 5 完成後仍沒有 PDF shared pool credit row。

驗收入口：

- SQL fixture：`supabase/tests/v2_professor_subscription_integration.sql`
- 本機執行器：`scripts/test-v2-professor-subscription.sh`
- ECPay／migration contract：`tests/v2-professor-subscription-contract.test.ts`

仍待外部設定：正式 Standard／Plus 月繳與年繳價格、ECPay merchant credentials、公開 webhook URL 與 Preview／Production 實際付款驗收。Local closure 不代表正式金流已上線。
