"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminContext } from "@/lib/admin/authorization";
import { createAdminClient } from "@/lib/supabase/server";
import type { LeadStatus } from "@/types/database";

const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "consulted",
  "purchased",
  "not_fit",
];

type AdminRpcArgs = Record<string, boolean | number | string | null>;

function getString(
  formData: FormData,
  key: string,
  maxLength = 500,
): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function getInteger(formData: FormData, key: string): number | null {
  const value = getString(formData, key, 12);
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function normalizeEmail(formData: FormData, key = "email") {
  return getString(formData, key, 320).toLowerCase();
}

function getReasonAndConfirmation(
  formData: FormData,
  expectedConfirmation: string,
) {
  const reason = getString(formData, "reason", 500);
  const confirmation = getString(formData, "confirmation", 80);

  if (
    reason.length < 3 ||
    reason.length > 500 ||
    confirmation !== expectedConfirmation
  ) {
    return null;
  }

  return { reason, confirmation };
}

function withMessage(path: string, message: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}message=${encodeURIComponent(message)}`;
}

async function executeAdminRpc({
  nextPath,
  rpcName,
  args,
  successMessage,
  errorMessage,
  revalidate,
}: {
  nextPath: string;
  rpcName: string;
  args: AdminRpcArgs;
  successMessage: string;
  errorMessage: string;
  revalidate: string[];
}) {
  const { user } = await requireAdminContext(nextPath);
  const admin = createAdminClient();
  const { error } = await admin.rpc(rpcName, {
    target_admin_user_id: user.id,
    target_request_id: randomUUID(),
    ...args,
  });

  if (error) {
    console.error("[admin-action] Mutation failed", {
      operation: rpcName,
      code: error.code,
    });
    redirect(withMessage(nextPath, errorMessage));
  }

  for (const path of revalidate) {
    revalidatePath(path);
  }
  redirect(withMessage(nextPath, successMessage));
}

export async function updateLeadStatus(formData: FormData) {
  const nextPath = "/admin/leads";
  const leadId = getString(formData, "leadId", 80);
  const status = getString(formData, "leadStatus", 40) as LeadStatus;
  const approval = getReasonAndConfirmation(formData, "CONFIRM_LEAD_STATUS");

  if (!leadId || !LEAD_STATUSES.includes(status) || !approval) {
    redirect(withMessage(nextPath, "invalid-admin-action"));
  }

  await executeAdminRpc({
    nextPath,
    rpcName: "admin_update_lead_status",
    args: {
      target_lead_id: leadId,
      target_status: status,
      target_reason: approval.reason,
    },
    successMessage: "lead-status-updated",
    errorMessage: "lead-update-failed",
    revalidate: [nextPath, "/admin/action-logs"],
  });
}

export async function unlockQuota(formData: FormData) {
  const email = normalizeEmail(formData);
  const nextPath = `/admin/quotas${email ? `?email=${encodeURIComponent(email)}` : ""}`;
  const approval = getReasonAndConfirmation(formData, "CONFIRM_QUOTA_UNLOCK");

  if (!email || !email.includes("@") || !approval) {
    redirect(withMessage(nextPath, "invalid-admin-action"));
  }

  await executeAdminRpc({
    nextPath,
    rpcName: "admin_unlock_free_usage_quota",
    args: {
      target_email: email,
      target_reason: approval.reason,
    },
    successMessage: "quota-unlocked",
    errorMessage: "quota-update-failed",
    revalidate: ["/admin/quotas", "/admin/action-logs"],
  });
}

export async function savePromptTemplate(formData: FormData) {
  const nextPath = "/admin/templates";
  const templateId = getString(formData, "templateId", 80);
  const systemRole = getString(formData, "systemRole", 12000);
  const contextTemplate = getString(formData, "contextTemplate", 12000);
  const taskTemplate = getString(formData, "taskTemplate", 12000);
  const outputTemplate = getString(formData, "outputTemplate", 12000);
  const officialDocNotes = getString(formData, "officialDocNotes", 12000);
  const approval = getReasonAndConfirmation(formData, "CONFIRM_TEMPLATE_UPDATE");

  if (
    !templateId ||
    !systemRole ||
    !contextTemplate ||
    !taskTemplate ||
    !outputTemplate ||
    !approval
  ) {
    redirect(withMessage(nextPath, "invalid-admin-action"));
  }

  await executeAdminRpc({
    nextPath: `${nextPath}?selected=${encodeURIComponent(templateId)}`,
    rpcName: "admin_update_prompt_template",
    args: {
      target_template_id: templateId,
      target_system_role: systemRole,
      target_context_template: contextTemplate,
      target_task_template: taskTemplate,
      target_output_template: outputTemplate,
      target_official_doc_notes: officialDocNotes || null,
      target_reason: approval.reason,
    },
    successMessage: "template-saved",
    errorMessage: "template-update-failed",
    revalidate: [nextPath, "/admin/action-logs", "/dashboard/ai-command"],
  });
}

export async function updateUserRole(formData: FormData) {
  const nextPath = "/admin/users";
  const userId = getString(formData, "userId", 80);
  const role = getString(formData, "role", 20);
  const approval = getReasonAndConfirmation(formData, "CONFIRM_ROLE_CHANGE");

  if (!userId || !["student", "professor"].includes(role) || !approval) {
    redirect(withMessage(nextPath, "invalid-admin-action"));
  }

  await executeAdminRpc({
    nextPath,
    rpcName: "admin_update_profile_role",
    args: {
      target_user_id: userId,
      target_role: role,
      target_reason: approval.reason,
    },
    successMessage: "user-role-updated",
    errorMessage: "user-role-update-failed",
    revalidate: [nextPath, "/admin/action-logs"],
  });
}

export async function updateUserAccountStatus(formData: FormData) {
  const nextPath = "/admin/users";
  const userId = getString(formData, "userId", 80);
  const accountStatus = getString(formData, "accountStatus", 20);
  const approval = getReasonAndConfirmation(
    formData,
    "CONFIRM_ACCOUNT_STATUS",
  );

  if (
    !userId ||
    !["active", "suspended"].includes(accountStatus) ||
    !approval
  ) {
    redirect(withMessage(nextPath, "invalid-admin-action"));
  }

  await executeAdminRpc({
    nextPath,
    rpcName: "admin_update_account_status",
    args: {
      target_user_id: userId,
      target_status: accountStatus,
      target_reason: approval.reason,
    },
    successMessage: "account-status-updated",
    errorMessage: "account-status-update-failed",
    revalidate: [nextPath, "/admin/action-logs"],
  });
}

export async function grantCourseEntitlement(formData: FormData) {
  const nextPath = "/admin/entitlements";
  const userId = getString(formData, "userId", 80);
  const productId = getString(formData, "productId", 80);
  const approval = getReasonAndConfirmation(
    formData,
    "CONFIRM_ENTITLEMENT_GRANT",
  );

  if (!userId || !productId || !approval) {
    redirect(withMessage(nextPath, "invalid-admin-action"));
  }

  await executeAdminRpc({
    nextPath,
    rpcName: "admin_grant_course_entitlement",
    args: {
      target_user_id: userId,
      target_product_id: productId,
      target_reason: approval.reason,
    },
    successMessage: "entitlement-granted",
    errorMessage: "entitlement-grant-failed",
    revalidate: [nextPath, "/admin/action-logs", "/learn"],
  });
}

export async function revokeCourseEntitlement(formData: FormData) {
  const nextPath = "/admin/entitlements";
  const entitlementId = getString(formData, "entitlementId", 80);
  const approval = getReasonAndConfirmation(
    formData,
    "CONFIRM_ENTITLEMENT_REVOKE",
  );

  if (!entitlementId || !approval) {
    redirect(withMessage(nextPath, "invalid-admin-action"));
  }

  await executeAdminRpc({
    nextPath,
    rpcName: "admin_revoke_course_entitlement",
    args: {
      target_entitlement_id: entitlementId,
      target_reason: approval.reason,
    },
    successMessage: "entitlement-revoked",
    errorMessage: "entitlement-revoke-failed",
    revalidate: [nextPath, "/admin/action-logs", "/learn"],
  });
}

export async function extendSubscription(formData: FormData) {
  const nextPath = "/admin/subscriptions";
  const subscriptionId = getString(formData, "subscriptionId", 80);
  const extensionDays = getInteger(formData, "extensionDays");
  const approval = getReasonAndConfirmation(
    formData,
    "CONFIRM_SUBSCRIPTION_EXTENSION",
  );

  if (
    !subscriptionId ||
    extensionDays === null ||
    extensionDays < 1 ||
    extensionDays > 30 ||
    !approval
  ) {
    redirect(withMessage(nextPath, "invalid-admin-action"));
  }

  await executeAdminRpc({
    nextPath,
    rpcName: "admin_extend_subscription",
    args: {
      target_subscription_id: subscriptionId,
      target_extension_days: extensionDays,
      target_reason: approval.reason,
    },
    successMessage: "subscription-extended",
    errorMessage: "subscription-extension-failed",
    revalidate: [nextPath, "/admin/labs", "/admin/action-logs", "/billing"],
  });
}

export async function compensatePdfCredits(formData: FormData) {
  const nextPath = "/admin/pdf-credits";
  const creditId = getString(formData, "creditId", 80);
  const creditAmount = getInteger(formData, "creditAmount");
  const approval = getReasonAndConfirmation(
    formData,
    "CONFIRM_CREDIT_COMPENSATION",
  );

  if (
    !creditId ||
    creditAmount === null ||
    creditAmount < 1 ||
    creditAmount > 100 ||
    !approval
  ) {
    redirect(withMessage(nextPath, "invalid-admin-action"));
  }

  await executeAdminRpc({
    nextPath,
    rpcName: "admin_compensate_pdf_credits",
    args: {
      target_credit_id: creditId,
      target_credit_amount: creditAmount,
      target_reason: approval.reason,
    },
    successMessage: "pdf-credits-compensated",
    errorMessage: "pdf-credit-compensation-failed",
    revalidate: [nextPath, "/admin/action-logs", "/dashboard/ai-audit"],
  });
}
