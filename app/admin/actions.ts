"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { canAccessWorkspace } from "@/lib/workspace/access";
import type { LeadStatus } from "@/types/database";

const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "consulted",
  "purchased",
  "not_fit",
];

function normalizeEmail(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !canAccessWorkspace(profile?.role, "admin")) {
    redirect("/dashboard");
  }

  return user;
}

export async function updateLeadStatus(formData: FormData) {
  await requireAdminUser();

  const leadId = getString(formData.get("leadId"));
  const status = getString(formData.get("leadStatus")) as LeadStatus;

  if (!leadId || !LEAD_STATUSES.includes(status)) {
    redirect("/admin/leads?message=invalid-lead-status");
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("leads")
    .update({ lead_status: status })
    .eq("id", leadId);

  if (error) {
    console.error("Admin lead update failed", { code: error.code });
    redirect("/admin/leads?message=lead-update-failed");
  }

  revalidatePath("/admin/leads");
  redirect("/admin/leads?message=lead-status-updated");
}

export async function unlockQuota(formData: FormData) {
  await requireAdminUser();

  const email = normalizeEmail(formData.get("email"));

  if (!email) {
    redirect("/admin/quotas?message=missing-email");
  }

  const supabase = createAdminClient();
  const { data: existingQuota, error: readError } = await supabase
    .from("free_usage_quotas")
    .select(
      "id,daily_limit,total_limit,admin_unlocked_total,unlocked_by_admin",
    )
    .eq("email", email)
    .maybeSingle();

  if (readError) {
    console.error("Admin quota lookup failed", { code: readError.code });
    redirect(`/admin/quotas?email=${email}&message=quota-lookup-failed`);
  }

  const payload = {
    email,
    unlocked_by_admin: true,
    admin_unlocked_total:
      Number(existingQuota?.admin_unlocked_total ?? 0) + 1,
    admin_note: "Unlocked from RAPID admin quotas page.",
    daily_limit: Number(existingQuota?.daily_limit ?? 2),
    total_limit: Number(existingQuota?.total_limit ?? 3),
  };

  const query = existingQuota
    ? supabase
        .from("free_usage_quotas")
        .update(payload)
        .eq("id", existingQuota.id)
    : supabase.from("free_usage_quotas").insert(payload);

  const { error } = await query;

  if (error) {
    console.error("Admin quota update failed", { code: error.code });
    redirect(`/admin/quotas?email=${email}&message=quota-update-failed`);
  }

  revalidatePath("/admin/quotas");
  redirect(`/admin/quotas?email=${email}&message=quota-unlocked`);
}

export async function savePromptTemplate(formData: FormData) {
  const user = await requireAdminUser();

  const templateId = getString(formData.get("templateId"));
  const systemRole = getString(formData.get("systemRole"));
  const contextTemplate = getString(formData.get("contextTemplate"));
  const taskTemplate = getString(formData.get("taskTemplate"));
  const outputTemplate = getString(formData.get("outputTemplate"));
  const officialDocNotes = getString(formData.get("officialDocNotes"));

  if (
    !templateId ||
    !systemRole ||
    !contextTemplate ||
    !taskTemplate ||
    !outputTemplate
  ) {
    redirect("/admin/templates?message=missing-template-fields");
  }

  const supabase = createAdminClient();
  const { data: currentTemplate, error: readError } = await supabase
    .from("prompt_templates")
    .select("version")
    .eq("id", templateId)
    .eq("is_active", true)
    .maybeSingle();

  if (readError || !currentTemplate) {
    if (readError) {
      console.error("Admin template lookup failed", { code: readError.code });
    }
    redirect("/admin/templates?message=active-template-not-found");
  }

  const { error } = await supabase
    .from("prompt_templates")
    .update({
      system_role: systemRole,
      context_template: contextTemplate,
      task_template: taskTemplate,
      output_template: outputTemplate,
      official_doc_notes: officialDocNotes || null,
      version: Number(currentTemplate.version ?? 1) + 1,
      updated_by: user.id,
    })
    .eq("id", templateId);

  if (error) {
    console.error("Admin template update failed", { code: error.code });
    redirect(`/admin/templates?selected=${templateId}&message=template-update-failed`);
  }

  revalidatePath("/admin/templates");
  redirect(`/admin/templates?selected=${templateId}&message=template-saved`);
}
