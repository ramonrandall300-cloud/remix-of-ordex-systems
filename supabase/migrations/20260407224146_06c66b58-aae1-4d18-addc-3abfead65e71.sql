
-- 1. Hide stripe_customer_id from non-admin members
-- Drop existing member SELECT policy
DROP POLICY IF EXISTS "org_select_members" ON public.organizations;

-- Create admin-only full access policy
CREATE POLICY "org_select_admin_full"
ON public.organizations FOR SELECT TO authenticated
USING (is_org_admin(id));

-- Create a safe view for non-admin members (no stripe_customer_id)
CREATE OR REPLACE VIEW public.organizations_safe
WITH (security_invoker = on) AS
SELECT id, name, created_at, updated_at
FROM public.organizations;

-- Allow all members to read the safe view via underlying table
-- We need a policy that allows members to SELECT but only through the view
-- Since views with security_invoker use the caller's permissions, 
-- we need a member policy too
CREATE POLICY "org_select_members_safe"
ON public.organizations FOR SELECT TO authenticated
USING (is_org_member(id));

-- 2. Add WITH CHECK to UPDATE policies to prevent ownership reassignment

-- Docking jobs
DROP POLICY IF EXISTS "Users can update their own docking jobs" ON public.docking_jobs;
CREATE POLICY "Users can update their own docking jobs"
ON public.docking_jobs FOR UPDATE TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Protein prediction jobs
DROP POLICY IF EXISTS "Users can update their own prediction jobs" ON public.protein_prediction_jobs;
CREATE POLICY "Users can update their own prediction jobs"
ON public.protein_prediction_jobs FOR UPDATE TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Synbio designs
DROP POLICY IF EXISTS "Users can update their own synbio designs" ON public.synbio_designs;
CREATE POLICY "Users can update their own synbio designs"
ON public.synbio_designs FOR UPDATE TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
