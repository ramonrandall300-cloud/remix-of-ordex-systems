
-- 1. Create is_org_admin security definer function
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_members
    WHERE user_id = _user_id
      AND org_id = _org_id
      AND role = 'admin'
  )
$$;

-- 2. Fix org_invites: restrict SELECT and DELETE to admins only
DROP POLICY IF EXISTS "Members can view org invites" ON public.org_invites;
DROP POLICY IF EXISTS "Members can create org invites" ON public.org_invites;
DROP POLICY IF EXISTS "Members can delete org invites" ON public.org_invites;

CREATE POLICY "Admins can view org invites"
ON public.org_invites FOR SELECT
USING (public.is_org_admin(auth.uid(), org_id));

CREATE POLICY "Admins can create org invites"
ON public.org_invites FOR INSERT
WITH CHECK (public.is_org_admin(auth.uid(), org_id));

CREATE POLICY "Admins can delete org invites"
ON public.org_invites FOR DELETE
USING (public.is_org_admin(auth.uid(), org_id));

-- 3. Add DELETE policy on org_members for admins
CREATE POLICY "Admins can remove org members"
ON public.org_members FOR DELETE
USING (public.is_org_admin(auth.uid(), org_id));

-- 4. Replace user_org_id()-based policies with direct org_members joins

-- org_members SELECT
DROP POLICY IF EXISTS "Members can view org members" ON public.org_members;
CREATE POLICY "Members can view org members"
ON public.org_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.org_members m
    WHERE m.org_id = org_members.org_id
    AND m.user_id = auth.uid()
  )
);

-- organizations SELECT & UPDATE
DROP POLICY IF EXISTS "Members can view their org" ON public.organizations;
DROP POLICY IF EXISTS "Members can update their org" ON public.organizations;

CREATE POLICY "Members can view their org"
ON public.organizations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.org_members m
    WHERE m.org_id = organizations.id
    AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can update their org"
ON public.organizations FOR UPDATE
USING (public.is_org_admin(auth.uid(), id));

-- credits SELECT
DROP POLICY IF EXISTS "Members can view org credits" ON public.credits;
CREATE POLICY "Members can view org credits"
ON public.credits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.org_members m
    WHERE m.org_id = credits.org_id
    AND m.user_id = auth.uid()
  )
);

-- usage_logs SELECT & INSERT
DROP POLICY IF EXISTS "Members can view org usage logs" ON public.usage_logs;
DROP POLICY IF EXISTS "Members can insert org usage logs" ON public.usage_logs;

CREATE POLICY "Members can view org usage logs"
ON public.usage_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.org_members m
    WHERE m.org_id = usage_logs.org_id
    AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Members can insert org usage logs"
ON public.usage_logs FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.org_members m
    WHERE m.org_id = usage_logs.org_id
    AND m.user_id = auth.uid()
  )
);

-- jobs INSERT & UPDATE (SELECT already fixed)
DROP POLICY IF EXISTS "Members can create org jobs" ON public.jobs;
DROP POLICY IF EXISTS "Members can update org jobs" ON public.jobs;

CREATE POLICY "Members can create org jobs"
ON public.jobs FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.org_members m
    WHERE m.org_id = jobs.org_id
    AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Members can update org jobs"
ON public.jobs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.org_members m
    WHERE m.org_id = jobs.org_id
    AND m.user_id = auth.uid()
  )
);

-- 5. Add UPDATE and DELETE policies on results storage bucket
CREATE POLICY "users can update own org results"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'results'
  AND EXISTS (
    SELECT 1 FROM public.org_members m
    WHERE m.org_id::text = (storage.foldername(name))[1]
    AND m.user_id = auth.uid()
  )
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "users can delete own org results"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'results'
  AND EXISTS (
    SELECT 1 FROM public.org_members m
    WHERE m.org_id::text = (storage.foldername(name))[1]
    AND m.user_id = auth.uid()
  )
  AND (storage.foldername(name))[2] = auth.uid()::text
);
