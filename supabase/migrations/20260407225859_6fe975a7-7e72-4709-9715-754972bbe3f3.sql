-- Remove the broad member SELECT on organizations base table
-- so non-admin members must go through organizations_safe view
DROP POLICY IF EXISTS "org_select_members" ON public.organizations;
