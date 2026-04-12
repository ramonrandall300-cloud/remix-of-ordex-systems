
-- Fix: Force role='member' on invite-based join to prevent privilege escalation
DROP POLICY IF EXISTS "Join org via invite only" ON public.org_members;
CREATE POLICY "Join org via invite only"
ON public.org_members FOR INSERT
WITH CHECK (
  org_members.role = 'member'
  AND EXISTS (
    SELECT 1
    FROM public.org_invites i
    JOIN auth.users u ON u.email = i.email
    WHERE i.org_id = org_members.org_id
    AND u.id = auth.uid()
    AND i.expires_at > now()
  )
);

-- Fix: Members can only update their own jobs
DROP POLICY IF EXISTS "Members can update org jobs" ON public.jobs;
CREATE POLICY "Members can update own jobs"
ON public.jobs FOR UPDATE
USING (user_id = auth.uid());
