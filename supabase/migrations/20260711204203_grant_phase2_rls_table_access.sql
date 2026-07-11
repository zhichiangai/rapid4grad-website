-- Explicit Data API grants for Phase 2 tables whose RLS policies authorize
-- authenticated workspace reads. RLS remains the row-level authority.
GRANT SELECT ON TABLE
  public.labs,
  public.lab_invite_codes,
  public.lab_memberships,
  public.student_documents,
  public.ai_audit_jobs,
  public.ai_audit_results,
  public.subscriptions,
  public.course_access,
  public.advisor_memories,
  public.prompt_templates
TO authenticated;

-- Server-only route handlers use service_role for controlled writes. These
-- grants do not expose tables to browser roles and service_role still remains
-- confined to trusted server code.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.labs,
  public.lab_invite_codes,
  public.lab_memberships,
  public.student_documents,
  public.ai_audit_jobs,
  public.ai_audit_results,
  public.ai_usage_credits,
  public.subscriptions,
  public.subscription_items,
  public.stripe_events,
  public.course_access,
  public.advisor_memories,
  public.prompt_templates,
  public.free_usage_quotas
TO service_role;

-- Manual local validation:
-- 1. authenticated owner SELECT is filtered by each table's RLS policies.
-- 2. cross-Lab users receive zero rows despite the table-level SELECT grant.
-- 3. authenticated retains no INSERT/UPDATE/DELETE grant on server-managed
--    Phase 2 tables.
-- 4. anon receives no new privileges.
