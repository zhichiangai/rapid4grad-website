# RAPID4GRAD Apps Script Deploy

本資料夾對應既有 RAPID4GRAD Apps Script 專案，不要建立新的 Apps Script 專案。

## 專案資訊

- Apps Script 專案 ID：`1AN09dmD0CS8yU9ehpUDnAv1mu7HTrG5-LJXT353UxlduJY2N2NEWqUEh`
- Google Sheet ID：`1eI3rOuEhEn--VdA8luYUbfkxwBaF5NO1E0hynGgOBvk`
- Web App URL：`https://script.google.com/macros/s/AKfycbwYsgYu5FmHLuT8ZunSupicMeyz1Ojwq6lRJvFKwzhbxj7XNWIbFI-V1x3wWMsRZnMV/exec`

## 重要帳號規則

RAPID 正式 Apps Script Web App deployment 必須使用 RAPID Gmail。

每次部署前一定要確認：

```bash
npx -y @google/clasp show-authorized-user
```

正確結果應該是：

```text
You are logged in as zhichiang@rapid4grad.com.
```

如果不是 RAPID Gmail，不要 deploy / redeploy。

## 是否每次都要重新登入？

不用。

`clasp login` 會把授權 token 存在本機 `~/.clasprc.json`。只要 token 還有效，而且 `show-authorized-user` 顯示 `zhichiang@rapid4grad.com`，就可以直接使用 `clasp pull`、`clasp push`、`clasp deployments`。

只有以下情況才需要重新登入：

- `show-authorized-user` 顯示 `Not logged in.`
- `show-authorized-user` 顯示的帳號不是 `zhichiang@rapid4grad.com`
- token 過期或 clasp 要求重新授權
- 換新電腦 / 新使用者環境
- 剛切去 NTUST CELL 或其他 Google Apps Script 專案帳號

## 第一次切換到 RAPID Gmail

1. 在 Terminal 執行：

```bash
npx -y @google/clasp logout
npx -y @google/clasp login --no-localhost
```

2. Terminal 會顯示一個很長的 Google 授權 URL。
3. 複製整段 URL，貼到已登入 RAPID Gmail 的 Chrome profile。
4. 請選 RAPID Gmail 並授權。
5. 授權完成後，瀏覽器可能跳到 `http://localhost:8888/?code=...`，即使顯示 localhost 無法連線也正常。
6. 複製瀏覽器網址列整段 `http://localhost:8888/?...`，貼回 Terminal，按 Enter。
7. 確認登入帳號：

```bash
npx -y @google/clasp show-authorized-user
```

8. 確認是 `zhichiang@rapid4grad.com` 後，再進入本資料夾：

```bash
cd "/Users/fengfeng/Library/CloudStorage/OneDrive-個人/雲端資料/線上課程/website_rapid/rapid4grad-website/backend/google-apps-script"
```

9. 拉取雲端專案確認權限：

```bash
npx -y @google/clasp pull
```

若 pull 會覆蓋本地檔案，先停止並確認，不要直接覆蓋本資料夾已整理好的分檔版本。

## 部署流程

正式流程：

```text
git commit -> git push -> clasp push -> clasp redeploy
```

目前這份 Apps Script 程式碼已經跟網站 repo 放在同一個專案樹。正式上線前，至少先確認：

```bash
npx -y @google/clasp push
npx -y @google/clasp deployments
```

更新既有 deployment 時，應使用既有 deployment ID，不要建立新 Apps Script 專案，也不要另外開新的 Web App。

## 測試

doGet：

```bash
curl -L "https://script.google.com/macros/s/AKfycbwYsgYu5FmHLuT8ZunSupicMeyz1Ojwq6lRJvFKwzhbxj7XNWIbFI-V1x3wWMsRZnMV/exec"
```

doPost：

```bash
curl -L "https://script.google.com/macros/s/AKfycbwYsgYu5FmHLuT8ZunSupicMeyz1Ojwq6lRJvFKwzhbxj7XNWIbFI-V1x3wWMsRZnMV/exec" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "school": "Test University",
    "degree_type": "master",
    "major": "Engineering",
    "current_year": "1",
    "main_problem": "測試表單寫入",
    "lead_source": "local_test"
  }'
```

注意：curl 測試 Apps Script POST 時不要加 `-X POST`。
