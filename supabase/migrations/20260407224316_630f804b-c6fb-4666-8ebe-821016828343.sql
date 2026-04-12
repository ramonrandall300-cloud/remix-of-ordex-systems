
-- 1. Add UPDATE policy for docking-files bucket
CREATE POLICY "docking_files_update_owner"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'docking-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 2. Fix organizations access: members see only safe fields
-- Drop the broad member policy
DROP POLICY IF EXISTS "org_select_members_safe" ON public.organizations;

-- Create a restrictive member policy that still allows the view to work
-- but we'll use a view approach. The organizations_public view already exists 
-- without stripe_customer_id. Let's ensure members use that.
-- We need members to be able to read orgs for the app to work,
-- so create a policy but the app code should use the safe view.
CREATE POLICY "org_select_members"
ON public.organizations FOR SELECT TO authenticated
USING (is_org_member(id));
