
-- Create org_invites table
CREATE TABLE public.org_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.org_invites ENABLE ROW LEVEL SECURITY;

-- Members can view invites for their org
CREATE POLICY "Members can view org invites"
ON public.org_invites FOR SELECT
USING (org_id = user_org_id(auth.uid()));

-- Members can create invites for their org
CREATE POLICY "Members can create org invites"
ON public.org_invites FOR INSERT
WITH CHECK (org_id = user_org_id(auth.uid()));

-- Members can delete invites for their org
CREATE POLICY "Members can delete org invites"
ON public.org_invites FOR DELETE
USING (org_id = user_org_id(auth.uid()));

-- Validation trigger for expires_at
CREATE OR REPLACE FUNCTION public.validate_invite_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'Invite expiration must be in the future';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_invite_expiry
BEFORE INSERT OR UPDATE ON public.org_invites
FOR EACH ROW EXECUTE FUNCTION public.validate_invite_expiry();

-- Drop the old permissive org_members INSERT policy
DROP POLICY IF EXISTS "Members can insert into their org" ON public.org_members;

-- New policy: join org only via valid invite
CREATE POLICY "Join org via invite only"
ON public.org_members FOR INSERT
WITH CHECK (
  exists (
    select 1
    from public.org_invites i
    join auth.users u on u.email = i.email
    where i.org_id = org_members.org_id
    and u.id = auth.uid()
    and i.expires_at > now()
  )
);
