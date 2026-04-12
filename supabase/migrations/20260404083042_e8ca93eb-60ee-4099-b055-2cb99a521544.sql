
-- 1. Remove the dangerous 2-arg is_org_admin overload
DROP FUNCTION IF EXISTS public.is_org_admin(uuid, uuid);

-- 2. Create a view that hides stripe_customer_id
CREATE OR REPLACE VIEW public.organizations_public
WITH (security_invoker = on) AS
SELECT id, name, created_at, updated_at
FROM public.organizations;

-- 3. Update org SELECT policy to deny direct table access
DROP POLICY IF EXISTS "org_select_members" ON public.organizations;
CREATE POLICY "org_select_via_view_only" ON public.organizations
FOR SELECT USING (false);

-- But allow the view (security invoker) to read via a SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.get_user_orgs()
RETURNS SETOF public.organizations_public
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.name, o.created_at, o.updated_at
  FROM public.organizations o
  INNER JOIN public.org_members m ON m.org_id = o.id
  WHERE m.user_id = auth.uid();
$$;

-- 4. Projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  org_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select_members" ON public.projects
FOR SELECT TO authenticated USING (is_org_member(org_id));

CREATE POLICY "projects_insert_members" ON public.projects
FOR INSERT TO authenticated WITH CHECK (is_org_member(org_id) AND user_id = auth.uid());

CREATE POLICY "projects_update_creator" ON public.projects
FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "projects_delete_creator" ON public.projects
FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Project files table
CREATE TABLE public.project_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'file',
  file_path TEXT,
  size_bytes BIGINT DEFAULT 0,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_files_select" ON public.project_files
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND is_org_member(p.org_id))
);

CREATE POLICY "project_files_insert" ON public.project_files
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND is_org_member(p.org_id))
);

CREATE POLICY "project_files_delete" ON public.project_files
FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 6. Viewer notes table
CREATE TABLE public.viewer_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pdb_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pdb_id, user_id)
);

ALTER TABLE public.viewer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "viewer_notes_select_own" ON public.viewer_notes
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "viewer_notes_insert_own" ON public.viewer_notes
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "viewer_notes_update_own" ON public.viewer_notes
FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "viewer_notes_delete_own" ON public.viewer_notes
FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER update_viewer_notes_updated_at
BEFORE UPDATE ON public.viewer_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Low-credit notification trigger
CREATE OR REPLACE FUNCTION public.notify_low_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _member RECORD;
BEGIN
  IF NEW.balance < 50 AND (OLD.balance >= 50 OR OLD.balance IS NULL) THEN
    FOR _member IN
      SELECT user_id FROM public.org_members WHERE org_id = NEW.org_id
    LOOP
      PERFORM create_notification(
        _member.user_id,
        'Low credit balance',
        format('Your organization credits are low (%s remaining). Top up to avoid job interruptions.', NEW.balance),
        'credit',
        jsonb_build_object('balance', NEW.balance, 'org_id', NEW.org_id)
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_low_credits_notify
AFTER UPDATE ON public.org_credits
FOR EACH ROW
EXECUTE FUNCTION public.notify_low_credits();
