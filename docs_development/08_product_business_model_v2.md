# RAPID4GRAD — Product Business Model V2

> 狀態：現行產品與商業模式唯一規格（Source of Truth）
> 生效日期：2026-07-19
> 若舊版產品規劃、Phase 1/2 文件或既有程式行為與本文衝突，以本文及 `09_entitlement_and_access_matrix_v2.md` 為準。既有程式不代表新模式已完成。

## 1. 產品雙主線

RAPID4GRAD 分成兩條可獨立購買、但共用帳號與課程內容的產品線：

1. **學生個人產品**：完整線上課程一次性買斷。
2. **教授／實驗室產品**：Professor Dashboard 與團隊 PDF AI 稽核訂閱。

學生買斷課程不等於取得 PDF AI 稽核；教授訂閱也不等於每位 Lab 學生永久取得完整課程。

## 2. 學生個人買斷

- 學生以一次性付款購買完整線上課程。
- 買斷後永久觀看所有 `full_course` 影片。
- 權限屬於個人，不依附教授或 Lab。
- 離開 Lab、教授停止訂閱或學生畢業，不影響已取得的買斷權限。
- 個人買斷不包含平台內 PDF AI 稽核。
- 買斷價格：**待定**。

## 3. Professor Lab 訂閱

Professor 是付款人，也是自己 Lab 的 owner；每位 Professor 同一時間最多擁有一個 active Lab，subscription 綁定該 Professor 建立的單一 Lab，而且每個 Lab 同時只能有一筆有效 subscription。Subscription 不提供 owner 轉移，Professor 更換、退休或離開時，新 Professor 需重新訂閱、建立自己的 Lab 並重新邀請學生。

教授訂閱的核心價值為：

- Professor Dashboard。
- Lab 與成員權限管理。
- 學生進度與經學生同意分享的 AI 稽核摘要。
- Professor Lab 團隊 PDF AI 稽核額度。
- 教授、助教與 Lab 學生可觀看的 `lab_basic` 部分影片。

方案分級：

| Plan key | 適用人數 | 價格 | 說明 |
|---|---:|---:|---|
| `professor_lab_standard` | 0–15 位 active students | 待定 | 每月 30 次 PDF AI 稽核 |
| `professor_lab_plus` | 0–30 位 active students | 待定 | 每月 100 次 PDF AI 稽核；第 16 位加入前必須完成升級 |
| `professor_lab_enterprise` | 31 位以上 active students | 人工洽談 | PDF 額度人工設定，不提供自助結帳 |

Standard 與 Plus 都支援月繳、年繳。每個 Professor 帳號可啟用一次 30 天免綁卡試用；試用由 RAPID4GRAD 自己管理，不建立綠界 0 元定期定額訂單。試用結束後，正式訂閱才由綠界定期定額處理。Professor 與 assistant 不計入 student seats，只有 `role = student` 且 `status = active` 的 membership 計入。每個 Lab 最多 3 位 active assistants，避免以 assistant 身分規避學生席位。

Standard／Plus 正式價格仍待公告。沒有 active `product_prices` 時，系統可展示方案與啟用試用，但不得建立正式付款單或使用假金額。

已付費 Standard 可自助立即升級 Plus，並在新 Plus 訂單選擇月繳或年繳。系統先停止 Standard 的未來定期扣款，再建立一筆完整 Plus 費用的即時付款；Plus 只在付款成功並通過 verified webhook 後立即生效，Standard 剩餘天數與金額不折抵、不退差額。若 Plus 付款未完成，Standard 僅維持至原已付款週期結束且不再續扣。Plus 降級 Standard，或不伴隨 Standard→Plus 升級的單純月繳／年繳週期切換，仍採人工處理，避免同時存在兩筆定期扣款。

## 4. Lab 學生的影片權限與升級

- 公開、Lab 與完整課程共用 `/learn` HTML5 網頁播放器，不使用 YouTube iframe；播放器路由不改變任何商業權限。
- 有效教授訂閱下的 active Lab student 可觀看 `lab_basic` 影片。
- Lab student 可支付優惠升級價，取得個人永久 `full_course` 權限。
- 升級價格：**待定**。
- 優惠資格只檢查付款當下是否為有效訂閱 Lab 的 active student；不要求最低加入天數，也不限制使用者為取得優惠而短暫加入 Lab。
- 每個帳號完成買斷後不再重複購買同一完整課程。
- 退出 Lab 或教授訂閱終止後，Lab 提供的 `lab_basic` 權限停止。
- 已自行買斷或完成 Lab 學生升級者，完整課程權限永久保留。

本文的永久權限表示該帳號的 `course_full` entitlement 不設定到期日，不因畢業、離開 Lab 或 Professor 退訂而失效；退款、拒付、詐欺或平台終止提供產品等例外另依正式服務條款處理。

## 5. PDF AI 稽核商業規則

平台內 PDF AI 稽核只提供給有效 Professor Lab，不作為一般學生個人買斷附贈功能。額度屬於 Lab shared pool，只有該 Lab 的 active students 可以上傳自己的 PDF 並消耗共同額度。

學生使用 PDF AI 稽核必須同時符合：

1. 所屬 Lab 的教授訂閱有效。
2. 學生是該 Lab 的 active member。
3. Lab 尚有可用 PDF 額度。
4. 上傳文件屬於學生本人。

一位學生同一時間只能加入一個 active Lab，因此每次 PDF 稽核直接扣除該唯一 Lab 的 shared pool，不提供跨 Lab 額度選擇。

Professor 與 assistant 管理團隊與查看安全摘要，但不直接以上傳者身分消耗 Lab PDF 額度。

教授與助教只能透過 summary-only 權限查看學生明確同意分享的摘要；不得因 Lab 關係直接讀取 private PDF、Storage object、完整 `result_markdown`、prompt、token/cost 或錯誤資訊。

Standard 每個 Lab 每月共用 30 次 PDF AI 稽核，Plus 每月共用 100 次。額度依 subscription 起始日建立月週期，每期重新配置、不結轉；Task 7 不提供超額加購。Enterprise 與個別客服例外由受控 Admin override 設定，不允許 Client 直接修改 counter。

開始稽核時先以資料庫原子操作預留 1 次額度；只有模型串流與結果持久化完整成功才結算為 used。使用者取消、provider 錯誤、串流中斷或結果寫入失敗時，預留額度必須以冪等 refund 退回。相同 idempotency key 重送只回傳同一 job，不可重複扣額度。

## 6. 不採用的舊模式

下列舊規格不再是現行商業模式：

- `NT$ 2,400 = 永久課程 + 6 個月個人 AI 工具`。
- `NT$ 890 / 6 個月` 的學生個人工具續約。
- `student_monthly`、`student_semester` 學生訂閱方案。
- 使用單一 `profiles.is_paid` 判定所有產品權限。
- 一般學生個人訂閱即可使用平台內 PDF AI 稽核。

## 7. 尚待決策

- 學生完整課程買斷價格。
- Lab 學生完整課程升級價格。
- 1–15 人 Professor Lab 訂閱月繳／年繳價格。
- 16–30 人 Professor Lab Plus 訂閱價格。
- 是否在未來提供 PDF 超額加購；Task 7 目前不提供。
- 訂閱失效後歷史 AI 稽核資料最終保留期限；目前先無限期保留為唯讀。
- 退款、拒付、詐欺或錯誤授權時撤銷永久 entitlement 的流程。

## 8. 訂閱失效

- Professor Dashboard 保留 read-only observation，可查看既有 Lab、成員與歷史安全摘要。
- 不可新增學生、產生邀請碼、修改成員或開始新的 PDF AI 稽核。
- Lab PDF shared pool 停止使用。
- Lab 提供的 `lab_basic` 影片停止觀看。
- 學生個人永久 `course_full` entitlement 不受影響。
- 學生仍可查看及刪除自己擁有的 private PDF 與歷史完整 AI 稽核結果；Professor/assistant 仍只能依有效 consent 與成員關係讀取安全摘要。
- 歷史資料目前不設定自動刪除期限，後續再決定正式保留政策。
- `past_due` 自付款失敗事件起提供 15 天寬限；寬限期間維持 Lab 管理、`lab_basic` 與 PDF 資格，寬限結束後轉為上述唯讀／停用狀態。

## 9. Admin 營運控制

學生買斷、Professor subscription、Lab seats、PDF credits 與付款同步異常由內部 Admin Control Plane 受控處理。Admin 不因角色自動取得產品 entitlement，也不能直接讀 private PDF 或 raw audit。完整規格見 `12_admin_control_plane_v2.md`。
