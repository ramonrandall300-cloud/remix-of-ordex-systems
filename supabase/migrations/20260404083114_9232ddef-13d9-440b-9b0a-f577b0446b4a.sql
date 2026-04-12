
-- Restore org SELECT for members (the view-only approach broke joins)
DROP POLICY IF EXISTS "org_select_via_view_only" ON public.organizations;
CREATE POLICY "org_select_members" ON public.organizations
FOR SELECT TO authenticated USING (is_org_member(id));
