-- Trigger functions run for authenticated writes while their execute privilege
-- remains restricted. SECURITY DEFINER lets the trigger enforce its invariant
-- without granting callers direct execution permission.
CREATE OR REPLACE FUNCTION public.prevent_lab_milestone_identity_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.lab_id IS DISTINCT FROM NEW.lab_id
     OR OLD.created_by IS DISTINCT FROM NEW.created_by THEN
    RAISE EXCEPTION 'lab_milestone_identity_immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_lab_resource_identity_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.lab_id IS DISTINCT FROM NEW.lab_id
     OR OLD.created_by IS DISTINCT FROM NEW.created_by THEN
    RAISE EXCEPTION 'lab_resource_identity_immutable';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_lab_milestone_identity_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_lab_resource_identity_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_lab_milestone_identity_change() TO service_role;
GRANT EXECUTE ON FUNCTION public.prevent_lab_resource_identity_change() TO service_role;
