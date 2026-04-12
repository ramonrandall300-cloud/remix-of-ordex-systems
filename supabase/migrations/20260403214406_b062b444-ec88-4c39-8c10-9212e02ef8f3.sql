
-- Fix: Jobs UPDATE should also verify org membership
DROP POLICY IF EXISTS "Members can update own jobs" ON public.jobs;
CREATE POLICY "Members can update own jobs"
ON public.jobs FOR UPDATE
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.org_members m
    WHERE m.org_id = jobs.org_id
    AND m.user_id = auth.uid()
  )
);
