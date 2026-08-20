# RAPID4GRAD — Free Prompt Builder Policy V2

> 狀態：現行免費 AI 指令產生器唯一規格
> 生效日期：2026-08-21
> 本文件只定義 `/ai-command` 與 `/dashboard/ai-command` 的外部 AI Prompt 生成流程；不適用於平台內 PDF AI 稽核。

## 1. 產品定位

研究報告 AI 指令產生器是免費的研究準備工具。使用者選擇研究情境、Meeting 場景與需求後，RAPID4GRAD 在前端組合可複製的文字 Prompt，供使用者自行貼入 ChatGPT、Claude、Gemini 或 Grok。

此流程不會在 RAPID4GRAD 上傳 PDF，也不會呼叫 RAPID4GRAD 的 LLM API。因此它不是課程買斷、Professor subscription 或 Lab PDF shared pool 的付費功能。

## 2. 用量規則

| 身分狀態 | 規則 |
|---|---|
| 未登入訪客 | 同一瀏覽器最多匿名生成 20 次，由 HttpOnly cookie 記錄 |
| Email 驗證完成 | 不限次生成 |
| Google 登入帳號 | 不限次生成；登入帳號的 Email 視為已驗證身分 |
| 課程買斷學生 | 不因買斷而改變；已登入即可不限次 |
| 有效／失效 Lab 成員、Professor、assistant、Admin | 不因 Lab、訂閱或 role 改變；已登入即可不限次 |

匿名第 21 次生成時，介面必須要求 Email 驗證。使用者完成驗證後立即可繼續生成，不存在每日上限、總次數上限、付款解鎖、額度加購或角色特權。

## 3. 安全與資料邊界

- 匿名 20 次的計數只存於 HttpOnly cookie；Client Component 不可自行偽造已驗證狀態。
- Email 驗證碼必須保持 10 分鐘有效期、寄送冷卻、同 Email／IP 頻率限制與 5 次錯誤 PIN 鎖定。
- `/api/ai-usage` 必須從 Supabase session 或 server-verified Email session 判定不限次資格；不得信任 Client body 宣稱已驗證。
- 每次生成可寫入 `ai_instruction_usages` 作最小使用紀錄，但不得讀寫 `free_usage_quotas`。
- `free_usage_quotas` 與 `/admin/quotas` 只保留 Phase 1 歷史相容資料，不得影響 V2 Prompt Builder。
- Prompt Template CMS 可改變指令文字，但不得改變本文件的用量規則。

## 4. 與 PDF AI 稽核的分界

平台內 PDF AI 稽核僅供有效訂閱 Lab 的 active students 使用，並消耗 Lab shared pool。Standard 為每月 30 次、Plus 為每月 100 次。該額度的 reserve、settle、refund、PDF Storage 與 consent 規則均不適用於免費 Prompt Builder。

任何後續 AI 實作必須先判斷功能屬於「外部 AI Prompt 生成」或「平台內 PDF AI 稽核」，不可共用 quota、付款、entitlement 或授權判斷。
