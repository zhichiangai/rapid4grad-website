-- RAPID4GRAD V2 baseline 005
-- Professor-owned Labs, scoped memberships, invitations, subscriptions, and seats.

CREATE TYPE public.lab_status AS ENUM ('active', 'archived');
CREATE TYPE public.lab_role AS ENUM ('professor', 'assistant', 'student');
CREATE TYPE public.lab_membership_status AS ENUM ('active', 'pending', 'removed');
CREATE TYPE public.professor_plan_key AS ENUM (
  'professor_lab_standard',
  'professor_lab_plus',
  'professor_lab_enterprise'
);
CREATE TYPE public.subscription_status AS ENUM (
  'incomplete',
  'trialing',
  'active',
  'past_due',
  'unpaid',
  'canceled',
  'expired'
);
CREATE TYPE public.subscription_interval AS ENUM ('month', 'year', 'manual');

CREATE TABLE public.labs (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  owner_professor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 120),
  institution TEXT,
  status public.lab_status NOT NULL DEFAULT 'active',
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT labs_archive_consistent CHECK (
    (status = 'active' AND archived_at IS NULL)
    OR (status = 'archived' AND archived_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX labs_one_active_per_owner_unique
  ON public.labs(owner_professor_id)
  WHERE status = 'active';
CREATE INDEX labs_status_idx ON public.labs(status);

CREATE TRIGGER labs_set_updated_at
BEFORE UPDATE ON public.labs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.lab_memberships (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  role public.lab_role NOT NULL,
  status public.lab_membership_status NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  removed_at TIMESTAMPTZ,
  removed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  removal_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (lab_id, user_id),
  CONSTRAINT lab_membership_removal_consistent CHECK (
    (status <> 'removed' AND removed_at IS NULL)
    OR (status = 'removed' AND removed_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX lab_memberships_one_active_lab_per_student_unique
  ON public.lab_memberships(user_id)
  WHERE role = 'student' AND status = 'active';
CREATE INDEX lab_memberships_lab_role_status_idx
  ON public.lab_memberships(lab_id, role, status);
CREATE INDEX lab_memberships_user_status_idx
  ON public.lab_memberships(user_id, status);

CREATE TRIGGER lab_memberships_set_updated_at
BEFORE UPDATE ON public.lab_memberships
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.lab_invite_codes (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  intended_role public.lab_role NOT NULL DEFAULT 'student',
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT lab_invite_usage_within_limit CHECK (
    max_uses IS NULL OR used_count <= max_uses
  )
);

CREATE INDEX lab_invite_codes_lab_active_idx
  ON public.lab_invite_codes(lab_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE RESTRICT,
  payer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_price_id UUID REFERENCES public.product_prices(id) ON DELETE RESTRICT,
  provider public.payment_provider NOT NULL,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  plan_key public.professor_plan_key NOT NULL,
  status public.subscription_status NOT NULL,
  billing_interval public.subscription_interval NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  last_provider_event_created_at TIMESTAMPTZ,
  last_provider_event_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT subscriptions_period_valid CHECK (current_period_end > current_period_start)
);

CREATE UNIQUE INDEX subscriptions_provider_id_unique
  ON public.subscriptions(provider, provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;
CREATE UNIQUE INDEX subscriptions_one_current_per_lab_unique
  ON public.subscriptions(lab_id)
  WHERE status IN ('incomplete', 'trialing', 'active', 'past_due', 'unpaid');
CREATE INDEX subscriptions_lab_period_idx
  ON public.subscriptions(lab_id, current_period_end DESC);
CREATE INDEX subscriptions_payer_idx ON public.subscriptions(payer_user_id);

CREATE TRIGGER subscriptions_set_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.subscription_items (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL CHECK (
    feature_key IN ('lab_dashboard', 'lab_basic', 'pdf_audit_pool', 'student_seats')
  ),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  provider_item_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (subscription_id, feature_key)
);

CREATE TRIGGER subscription_items_set_updated_at
BEFORE UPDATE ON public.subscription_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION app_private.owns_lab(target_lab_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.labs AS lab
    WHERE lab.id = target_lab_id
      AND lab.owner_professor_id = (SELECT auth.uid())
      AND lab.status = 'active'::public.lab_status
  );
$$;

CREATE OR REPLACE FUNCTION app_private.is_active_lab_member(
  target_lab_id UUID,
  allowed_roles public.lab_role[] DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lab_memberships AS membership
    WHERE membership.lab_id = target_lab_id
      AND membership.user_id = (SELECT auth.uid())
      AND membership.status = 'active'::public.lab_membership_status
      AND (allowed_roles IS NULL OR membership.role = ANY(allowed_roles))
  );
$$;

CREATE OR REPLACE FUNCTION app_private.has_active_lab_subscription(target_lab_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions AS subscription
    WHERE subscription.lab_id = target_lab_id
      AND subscription.status IN (
        'active'::public.subscription_status,
        'trialing'::public.subscription_status
      )
      AND subscription.current_period_start <= timezone('utc', now())
      AND subscription.current_period_end > timezone('utc', now())
  );
$$;

CREATE OR REPLACE FUNCTION app_private.has_lab_basic_access(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lab_memberships AS membership
    JOIN public.subscriptions AS subscription
      ON subscription.lab_id = membership.lab_id
    WHERE membership.user_id = target_user_id
      AND membership.status = 'active'::public.lab_membership_status
      AND subscription.status IN (
        'active'::public.subscription_status,
        'trialing'::public.subscription_status
      )
      AND subscription.current_period_start <= timezone('utc', now())
      AND subscription.current_period_end > timezone('utc', now())
  );
$$;

REVOKE ALL ON FUNCTION app_private.owns_lab(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_private.is_active_lab_member(UUID, public.lab_role[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_private.has_active_lab_subscription(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_private.has_lab_basic_access(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.owns_lab(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_active_lab_member(UUID, public.lab_role[])
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.has_active_lab_subscription(UUID)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.has_lab_basic_access(UUID)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.validate_subscription_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  lab_owner UUID;
  lab_state public.lab_status;
  product_kind public.product_type;
BEGIN
  SELECT owner_professor_id, status
  INTO lab_owner, lab_state
  FROM public.labs
  WHERE id = NEW.lab_id
  FOR UPDATE;

  IF NOT FOUND OR lab_state <> 'active'::public.lab_status THEN
    RAISE EXCEPTION 'active_lab_not_found';
  END IF;

  IF NEW.payer_user_id <> lab_owner THEN
    RAISE EXCEPTION 'subscription_payer_must_be_lab_owner';
  END IF;

  SELECT product_type
  INTO product_kind
  FROM public.products
  WHERE id = NEW.product_id;

  IF product_kind <> 'professor_subscription'::public.product_type THEN
    RAISE EXCEPTION 'invalid_professor_subscription_product';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION app_private.validate_subscription_owner()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER subscriptions_validate_owner
BEFORE INSERT OR UPDATE OF lab_id, payer_user_id, product_id, status
ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION app_private.validate_subscription_owner();

CREATE OR REPLACE FUNCTION app_private.enforce_lab_membership_invariants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  lab_owner UUID;
  lab_state public.lab_status;
  user_profile_role public.profile_role;
  user_account_state public.account_status;
  current_plan public.professor_plan_key;
  seat_limit INTEGER;
  active_count INTEGER;
BEGIN
  IF NEW.status <> 'active'::public.lab_membership_status THEN
    RETURN NEW;
  END IF;

  SELECT owner_professor_id, status
  INTO lab_owner, lab_state
  FROM public.labs
  WHERE id = NEW.lab_id
  FOR UPDATE;

  IF NOT FOUND OR lab_state <> 'active'::public.lab_status THEN
    RAISE EXCEPTION 'active_lab_not_found';
  END IF;

  SELECT role, account_status
  INTO user_profile_role, user_account_state
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF NOT FOUND OR user_account_state <> 'active'::public.account_status THEN
    RAISE EXCEPTION 'active_profile_not_found';
  END IF;

  IF NEW.role = 'student'::public.lab_role
     AND user_profile_role <> 'student'::public.profile_role THEN
    RAISE EXCEPTION 'student_profile_role_required';
  END IF;

  IF NEW.role IN ('professor'::public.lab_role, 'assistant'::public.lab_role)
     AND user_profile_role <> 'professor'::public.profile_role THEN
    RAISE EXCEPTION 'professor_profile_role_required';
  END IF;

  IF NEW.role = 'professor'::public.lab_role AND NEW.user_id = lab_owner THEN
    RETURN NEW;
  END IF;

  SELECT subscription.plan_key
  INTO current_plan
  FROM public.subscriptions AS subscription
  WHERE subscription.lab_id = NEW.lab_id
    AND subscription.status IN (
      'active'::public.subscription_status,
      'trialing'::public.subscription_status
    )
    AND subscription.current_period_start <= timezone('utc', now())
    AND subscription.current_period_end > timezone('utc', now())
  ORDER BY subscription.current_period_end DESC
  LIMIT 1;

  IF current_plan IS NULL THEN
    RAISE EXCEPTION 'active_lab_subscription_required';
  END IF;

  IF NEW.role = 'student'::public.lab_role THEN
    seat_limit := CASE current_plan
      WHEN 'professor_lab_standard'::public.professor_plan_key THEN 15
      WHEN 'professor_lab_plus'::public.professor_plan_key THEN 30
      ELSE 2147483647
    END;

    SELECT count(*)
    INTO active_count
    FROM public.lab_memberships AS membership
    WHERE membership.lab_id = NEW.lab_id
      AND membership.role = 'student'::public.lab_role
      AND membership.status = 'active'::public.lab_membership_status
      AND membership.id <> NEW.id;

    IF active_count >= seat_limit THEN
      RAISE EXCEPTION 'student_seat_limit_reached';
    END IF;
  ELSIF NEW.role = 'assistant'::public.lab_role THEN
    SELECT count(*)
    INTO active_count
    FROM public.lab_memberships AS membership
    WHERE membership.lab_id = NEW.lab_id
      AND membership.role = 'assistant'::public.lab_role
      AND membership.status = 'active'::public.lab_membership_status
      AND membership.id <> NEW.id;

    IF active_count >= 3 THEN
      RAISE EXCEPTION 'assistant_limit_reached';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION app_private.enforce_lab_membership_invariants()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER lab_memberships_enforce_invariants
BEFORE INSERT OR UPDATE OF lab_id, user_id, role, status
ON public.lab_memberships
FOR EACH ROW EXECUTE FUNCTION app_private.enforce_lab_membership_invariants();

CREATE OR REPLACE FUNCTION public.create_professor_lab(
  target_professor_id UUID,
  target_name TEXT,
  target_institution TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_lab_id UUID;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(target_professor_id::TEXT, 0));

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = target_professor_id
      AND profile.role = 'professor'::public.profile_role
      AND profile.account_status = 'active'::public.account_status
  ) THEN
    RAISE EXCEPTION 'active_professor_profile_required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.labs AS lab
    WHERE lab.owner_professor_id = target_professor_id
      AND lab.status = 'active'::public.lab_status
  ) THEN
    RAISE EXCEPTION 'professor_already_owns_active_lab';
  END IF;

  INSERT INTO public.labs(owner_professor_id, name, institution)
  VALUES (target_professor_id, trim(target_name), NULLIF(trim(target_institution), ''))
  RETURNING id INTO new_lab_id;

  INSERT INTO public.lab_memberships(lab_id, user_id, role, status)
  VALUES (
    new_lab_id,
    target_professor_id,
    'professor'::public.lab_role,
    'active'::public.lab_membership_status
  );

  RETURN new_lab_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_lab_invite(
  target_actor_id UUID,
  target_lab_id UUID,
  target_hash TEXT,
  target_role public.lab_role,
  target_expires_at TIMESTAMPTZ,
  target_max_uses INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_invite_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.labs AS lab
    WHERE lab.id = target_lab_id
      AND lab.owner_professor_id = target_actor_id
      AND lab.status = 'active'::public.lab_status
  ) THEN
    RAISE EXCEPTION 'lab_owner_required';
  END IF;

  IF NOT app_private.has_active_lab_subscription(target_lab_id) THEN
    RAISE EXCEPTION 'active_lab_subscription_required';
  END IF;

  IF target_expires_at <= timezone('utc', now()) THEN
    RAISE EXCEPTION 'invite_expiry_must_be_future';
  END IF;

  INSERT INTO public.lab_invite_codes(
    lab_id,
    code_hash,
    created_by,
    intended_role,
    expires_at,
    max_uses
  )
  VALUES (
    target_lab_id,
    target_hash,
    target_actor_id,
    target_role,
    target_expires_at,
    target_max_uses
  )
  RETURNING id INTO new_invite_id;

  RETURN new_invite_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_lab_invite(
  target_hash TEXT,
  target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_invite public.lab_invite_codes%ROWTYPE;
  selected_lab public.labs%ROWTYPE;
  existing_membership public.lab_memberships%ROWTYPE;
BEGIN
  SELECT *
  INTO selected_invite
  FROM public.lab_invite_codes
  WHERE code_hash = target_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invite_not_found';
  END IF;

  SELECT *
  INTO selected_lab
  FROM public.labs
  WHERE id = selected_invite.lab_id
  FOR UPDATE;

  IF selected_lab.status <> 'active'::public.lab_status THEN
    RAISE EXCEPTION 'active_lab_not_found';
  END IF;

  IF selected_invite.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'invite_revoked';
  END IF;

  IF selected_invite.expires_at <= timezone('utc', now()) THEN
    RAISE EXCEPTION 'invite_expired';
  END IF;

  SELECT *
  INTO existing_membership
  FROM public.lab_memberships
  WHERE lab_id = selected_invite.lab_id
    AND user_id = target_user_id;

  IF FOUND AND existing_membership.status = 'active'::public.lab_membership_status THEN
    RETURN jsonb_build_object(
      'labId', selected_lab.id,
      'labName', selected_lab.name,
      'institution', selected_lab.institution,
      'role', existing_membership.role,
      'alreadyJoined', TRUE
    );
  END IF;

  IF selected_invite.max_uses IS NOT NULL
     AND selected_invite.used_count >= selected_invite.max_uses THEN
    RAISE EXCEPTION 'invite_limit_reached';
  END IF;

  INSERT INTO public.lab_memberships(
    lab_id,
    user_id,
    role,
    status,
    joined_at,
    removed_at,
    removed_by,
    removal_reason
  )
  VALUES (
    selected_invite.lab_id,
    target_user_id,
    selected_invite.intended_role,
    'active'::public.lab_membership_status,
    timezone('utc', now()),
    NULL,
    NULL,
    NULL
  )
  ON CONFLICT (lab_id, user_id) DO UPDATE
  SET
    role = EXCLUDED.role,
    status = 'active'::public.lab_membership_status,
    joined_at = timezone('utc', now()),
    removed_at = NULL,
    removed_by = NULL,
    removal_reason = NULL,
    updated_at = timezone('utc', now());

  UPDATE public.lab_invite_codes
  SET used_count = used_count + 1
  WHERE id = selected_invite.id;

  RETURN jsonb_build_object(
    'labId', selected_lab.id,
    'labName', selected_lab.name,
    'institution', selected_lab.institution,
    'role', selected_invite.intended_role,
    'alreadyJoined', FALSE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_lab_invite(
  target_actor_id UUID,
  target_invite_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.lab_invite_codes AS invite
  SET revoked_at = COALESCE(invite.revoked_at, timezone('utc', now()))
  FROM public.labs AS lab
  WHERE invite.id = target_invite_id
    AND lab.id = invite.lab_id
    AND lab.owner_professor_id = target_actor_id
    AND lab.status = 'active'::public.lab_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lab_owner_or_invite_not_found';
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.create_professor_lab(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_lab_invite(UUID, UUID, TEXT, public.lab_role, TIMESTAMPTZ, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.redeem_lab_invite(TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_lab_invite(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_professor_lab(UUID, TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.create_lab_invite(UUID, UUID, TEXT, public.lab_role, TIMESTAMPTZ, INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.redeem_lab_invite(TEXT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_lab_invite(UUID, UUID)
  TO service_role;

ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_items ENABLE ROW LEVEL SECURITY;
