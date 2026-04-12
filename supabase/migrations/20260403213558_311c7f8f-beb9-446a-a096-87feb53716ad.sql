
-- Drop existing SELECT policy on jobs
DROP POLICY IF EXISTS "Members can view org jobs" ON public.jobs;

-- Create new SELECT policy using direct org_members check
CREATE POLICY "org members can view jobs"
ON public.jobs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.org_members m
    WHERE m.org_id = jobs.org_id
    AND m.user_id = auth.uid()
  )
);
