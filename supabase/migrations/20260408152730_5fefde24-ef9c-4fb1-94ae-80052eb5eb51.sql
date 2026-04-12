
-- Create a security definer function to safely delete an organization
-- Only the calling user must be an admin/owner of the org
CREATE OR REPLACE FUNCTION public.delete_organization(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller uuid := auth.uid();
  _member_count integer;
BEGIN
  -- Verify caller is admin/owner
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = _org_id AND user_id = _caller AND role IN ('admin', 'owner')
  ) THEN
    RAISE EXCEPTION 'Only org admins can delete an organization';
  END IF;

  -- Clean up all org-scoped data
  DELETE FROM public.usage_logs WHERE org_id = _org_id;
  DELETE FROM public.audit_logs WHERE org_id = _org_id;
  DELETE FROM public.gpu_snapshots WHERE org_id = _org_id;
  DELETE FROM public.jobs WHERE org_id = _org_id;
  DELETE FROM public.org_invites WHERE org_id = _org_id;
  DELETE FROM public.org_credits WHERE org_id = _org_id;
  DELETE FROM public.credits WHERE org_id = _org_id;
  DELETE FROM public.org_members WHERE org_id = _org_id;

  -- Delete projects and their files
  DELETE FROM public.project_files WHERE project_id IN (
    SELECT id FROM public.projects WHERE org_id = _org_id
  );
  DELETE FROM public.projects WHERE org_id = _org_id;

  -- Finally delete the organization itself
  DELETE FROM public.organizations WHERE id = _org_id;
END;
$$;
