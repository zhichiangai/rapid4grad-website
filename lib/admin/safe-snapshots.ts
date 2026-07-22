import type { Json } from "@/types/database-v2.generated";

const SAFE_ADMIN_SNAPSHOT_KEYS = new Set([
  "id",
  "user_id",
  "product_id",
  "role",
  "account_status",
  "entitlement_type",
  "status",
  "starts_at",
  "ends_at",
  "revoked_at",
  "lab_id",
  "subscription_id",
  "plan_key",
  "current_period_end",
  "trial_ends_at",
  "grace_ends_at",
  "cancel_at_period_end",
  "extension_days",
  "period_start",
  "period_end",
  "pdf_audit_limit",
  "pdf_audit_reserved",
  "pdf_audit_used",
  "compensation_amount",
  "lead_status",
  "daily_limit",
  "total_limit",
  "unlocked_by_admin",
  "admin_unlocked_total",
  "target_ai",
  "template_type",
  "version",
  "is_active",
]);

export function sanitizeAdminSnapshot(value: Json | null): Json | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const safeEntries = Object.entries(value)
    .filter(([key]) => SAFE_ADMIN_SNAPSHOT_KEYS.has(key))
    .map(([key, nestedValue]) => [key, sanitizeAdminSnapshot(nestedValue ?? null)]);

  return Object.fromEntries(safeEntries) as Json;
}
