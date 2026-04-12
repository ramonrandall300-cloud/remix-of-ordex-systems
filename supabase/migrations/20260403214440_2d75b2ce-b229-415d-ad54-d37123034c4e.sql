
-- Add explicit UPDATE policy: only admins can update org_members (e.g. change roles)
CREATE POLICY "Admins can update org members"
ON public.org_members FOR UPDATE
USING (public.is_org_admin(auth.uid(), org_id));

-- Remove direct user INSERT on usage_logs — should be service_role only
DROP POLICY IF EXISTS "Members can insert org usage logs" ON public.usage_logs;
CREATE POLICY "No direct usage log inserts"
ON public.usage_logs FOR INSERT
WITH CHECK (false);
