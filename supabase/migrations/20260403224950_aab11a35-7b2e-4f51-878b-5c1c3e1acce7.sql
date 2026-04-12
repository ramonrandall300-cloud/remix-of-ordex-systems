
-- =====================================================
-- PRODUCTION-READY MULTI-TENANT SaaS BACKEND
-- =====================================================

-- Step 1: Drop ALL policies that reference is_org_admin(uuid, uuid)
DROP POLICY IF EXISTS "Admins can view org invites" ON public.org_invites;
DROP POLICY IF EXISTS "Admins can create org invites" ON public.org_invites;
DROP POLICY IF EXISTS "Admins can delete org invites" ON public.org_invites;
DROP POLICY IF EXISTS "Admins can remove org members" ON public.org_members;
DROP POLICY IF EXISTS "Admins can update their org" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update org members" ON public.org_members;
DROP POLICY IF EXISTS "Members can view their org" ON public.organizations;
DROP POLICY IF EXISTS "Members can view org members" ON public.org_members;
DROP POLICY IF EXISTS "Join org via invite only" ON public.org_members;
DROP POLICY IF EXISTS "org members can view jobs" ON public.jobs;
DROP POLICY IF EXISTS "Members can create org jobs" ON public.jobs;
DROP POLICY IF EXISTS "Members can update own jobs" ON public.jobs;

-- Step 2: Drop and recreate functions
DROP FUNCTION IF EXISTS public.is_org_admin(uuid, uuid);

-- is_org_member: single-arg, uses auth.uid()
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = _org_id AND user_id = auth.uid()
  )
$$;

-- is_org_admin: single-arg, uses auth.uid()
CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = _org_id AND user_id = auth.uid()
      AND role IN ('admin', 'owner')
  )
$$;

-- Backward-compatible 2-arg version
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = _user_id AND org_id = _org_id
      AND role IN ('admin', 'owner')
  )
$$;

-- =====================================================
-- ORGANIZATIONS — RLS policies
-- =====================================================
CREATE POLICY "org_select_members" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(id));
CREATE POLICY "org_insert_blocked" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (false);
CREATE POLICY "org_update_admin" ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_org_admin(id));
CREATE POLICY "org_delete_blocked" ON public.organizations FOR DELETE TO authenticated
  USING (false);

-- =====================================================
-- ORG_MEMBERS — RLS policies & indexes
-- =====================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'org_members_org_user_unique') THEN
    ALTER TABLE public.org_members ADD CONSTRAINT org_members_org_user_unique UNIQUE (org_id, user_id);
  END IF;
END $$;

CREATE POLICY "orgmembers_select" ON public.org_members FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "orgmembers_insert_admin" ON public.org_members FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(org_id));
CREATE POLICY "orgmembers_update_blocked" ON public.org_members FOR UPDATE TO authenticated
  USING (false);
CREATE POLICY "orgmembers_delete_admin" ON public.org_members FOR DELETE TO authenticated
  USING (public.is_org_admin(org_id));

CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.org_members(org_id);

-- =====================================================
-- ORG_INVITES — recreate policies with new function
-- =====================================================
CREATE POLICY "orginvites_select_admin" ON public.org_invites FOR SELECT TO authenticated
  USING (public.is_org_admin(org_id));
CREATE POLICY "orginvites_insert_admin" ON public.org_invites FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(org_id));
CREATE POLICY "orginvites_delete_admin" ON public.org_invites FOR DELETE TO authenticated
  USING (public.is_org_admin(org_id));

-- =====================================================
-- ORG_CREDITS — new table, fully locked down
-- =====================================================
CREATE TABLE IF NOT EXISTS public.org_credits (
  org_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.org_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orgcredits_select" ON public.org_credits FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "orgcredits_insert_blocked" ON public.org_credits FOR INSERT TO authenticated
  WITH CHECK (false);
CREATE POLICY "orgcredits_update_blocked" ON public.org_credits FOR UPDATE TO authenticated
  USING (false);
CREATE POLICY "orgcredits_delete_blocked" ON public.org_credits FOR DELETE TO authenticated
  USING (false);

-- =====================================================
-- JOBS — add columns, update policies, indexes
-- =====================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='jobs' AND column_name='created_by'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN created_by uuid;
    UPDATE public.jobs SET created_by = user_id WHERE created_by IS NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='jobs' AND column_name='payload'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN payload jsonb;
    UPDATE public.jobs SET payload = jsonb_build_object('input', input, 'output', output)
    WHERE payload IS NULL AND (input IS NOT NULL OR output IS NOT NULL);
  END IF;
END $$;

CREATE POLICY "jobs_select_members" ON public.jobs FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "jobs_insert_members" ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id) AND created_by = auth.uid());
CREATE POLICY "jobs_update_creator_or_admin" ON public.jobs FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_org_admin(org_id));
CREATE POLICY "jobs_delete_admin" ON public.jobs FOR DELETE TO authenticated
  USING (public.is_org_admin(org_id));

CREATE INDEX IF NOT EXISTS idx_jobs_org_id ON public.jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON public.jobs(created_by);

-- =====================================================
-- Update decrement_credits for org_credits table
-- =====================================================
CREATE OR REPLACE FUNCTION public.decrement_credits(_org_id uuid, _amount integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.org_credits
  SET balance = balance - _amount, updated_at = now()
  WHERE org_id = _org_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_credits(uuid, integer) TO authenticated;
