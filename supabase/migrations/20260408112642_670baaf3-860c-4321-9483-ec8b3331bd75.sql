
-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  org_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX idx_audit_logs_org_id ON public.audit_logs (org_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit logs
CREATE POLICY "audit_logs_select_own"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Org admins can view all audit logs for their org
CREATE POLICY "audit_logs_select_org_admin"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (org_id IS NOT NULL AND is_org_admin(org_id));

-- No direct inserts from clients (only via security definer function)
CREATE POLICY "audit_logs_insert_blocked"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (false);

-- No updates allowed (immutable)
CREATE POLICY "audit_logs_update_blocked"
ON public.audit_logs
FOR UPDATE
TO authenticated
USING (false);

-- No deletes allowed (immutable)
CREATE POLICY "audit_logs_delete_blocked"
ON public.audit_logs
FOR DELETE
TO authenticated
USING (false);

-- Security definer function to insert audit logs (bypasses RLS)
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _user_id UUID,
  _action TEXT,
  _entity_type TEXT DEFAULT NULL,
  _entity_id TEXT DEFAULT NULL,
  _details JSONB DEFAULT '{}'::jsonb,
  _org_id UUID DEFAULT NULL,
  _ip_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id UUID;
BEGIN
  INSERT INTO public.audit_logs (user_id, org_id, action, entity_type, entity_id, details, ip_address)
  VALUES (_user_id, _org_id, _action, _entity_type, _entity_id, _details, _ip_address)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- Trigger: log organization settings updates
CREATE OR REPLACE FUNCTION public.audit_org_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM log_audit_event(
    auth.uid(),
    'organization.updated',
    'organization',
    NEW.id::text,
    jsonb_build_object('old_name', OLD.name, 'new_name', NEW.name),
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_org_update
AFTER UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.audit_org_update();

-- Trigger: log team member additions
CREATE OR REPLACE FUNCTION public.audit_member_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM log_audit_event(
    COALESCE(auth.uid(), NEW.user_id),
    'member.added',
    'org_member',
    NEW.id::text,
    jsonb_build_object('member_user_id', NEW.user_id, 'role', NEW.role),
    NEW.org_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_member_added
AFTER INSERT ON public.org_members
FOR EACH ROW
EXECUTE FUNCTION public.audit_member_added();

-- Trigger: log team member removals
CREATE OR REPLACE FUNCTION public.audit_member_removed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM log_audit_event(
    COALESCE(auth.uid(), OLD.user_id),
    'member.removed',
    'org_member',
    OLD.id::text,
    jsonb_build_object('member_user_id', OLD.user_id, 'role', OLD.role),
    OLD.org_id
  );
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_audit_member_removed
AFTER DELETE ON public.org_members
FOR EACH ROW
EXECUTE FUNCTION public.audit_member_removed();

-- Trigger: log credit balance changes
CREATE OR REPLACE FUNCTION public.audit_credit_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM log_audit_event(
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    'credits.changed',
    'org_credits',
    NEW.org_id::text,
    jsonb_build_object('old_balance', OLD.balance, 'new_balance', NEW.balance, 'delta', NEW.balance - OLD.balance),
    NEW.org_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_credit_change
AFTER UPDATE ON public.org_credits
FOR EACH ROW
WHEN (OLD.balance IS DISTINCT FROM NEW.balance)
EXECUTE FUNCTION public.audit_credit_change();
