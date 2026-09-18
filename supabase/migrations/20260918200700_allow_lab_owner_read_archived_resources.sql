-- Allow only an active owner professor to inspect archived resources in their own active Lab.
-- The existing active-resource policy remains unchanged.
CREATE POLICY "lab_resources_select_archived_owner"
ON public.lab_resources FOR SELECT TO authenticated
USING (
  archived_at IS NOT NULL
  AND app_private.is_active_user((SELECT auth.uid()))
  AND app_private.owns_lab(lab_id)
);
