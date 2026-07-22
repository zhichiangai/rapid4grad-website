const ADMIN_MESSAGES: Record<string, string> = {
  "invalid-admin-action": "操作資料不完整或尚未完成二次確認。",
  "lead-status-updated": "Lead 狀態已更新並留下操作紀錄。",
  "lead-update-failed": "目前無法更新 Lead 狀態，請稍後再試。",
  "quota-unlocked": "Legacy 免費額度已解鎖並留下操作紀錄。",
  "quota-update-failed": "目前無法更新 Legacy 額度，請稍後再試。",
  "template-saved": "Prompt 模板已更新並留下版本與操作紀錄。",
  "template-update-failed": "目前無法更新 Prompt 模板，請稍後再試。",
  "user-role-updated": "使用者角色已修正並留下操作紀錄。",
  "user-role-update-failed": "角色修正失敗；Admin 角色不能由此介面變更。",
  "account-status-updated": "帳號狀態已更新並留下操作紀錄。",
  "account-status-update-failed": "帳號狀態更新失敗；Admin 帳號受保護。",
  "entitlement-granted": "完整課程權限已補發並留下操作紀錄。",
  "entitlement-grant-failed": "權限補發失敗；請確認帳號與產品狀態。",
  "entitlement-revoked": "完整課程權限已撤銷並留下操作紀錄。",
  "entitlement-revoke-failed": "權限撤銷失敗；請確認權限仍為 active。",
  "subscription-extended": "訂閱已完成客服延長並留下操作紀錄。",
  "subscription-extension-failed": "訂閱延長失敗；只有功能仍有效的訂閱可延長。",
  "pdf-credits-compensated": "當期 PDF 額度已補償並留下操作紀錄。",
  "pdf-credit-compensation-failed": "PDF 額度補償失敗；請確認週期與訂閱仍有效。",
};

export function resolveAdminMessage(code: string | undefined) {
  if (!code) return "";
  return ADMIN_MESSAGES[code] ?? "操作未完成，請重新檢查後再試。";
}
