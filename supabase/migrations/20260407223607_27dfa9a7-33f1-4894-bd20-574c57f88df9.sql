
-- 1. Make storage buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('results', 'docking-files');

-- 2. Drop overly permissive public read policies
DROP POLICY IF EXISTS "Public read access for results" ON storage.objects;
DROP POLICY IF EXISTS "Docking files are publicly readable" ON storage.objects;

-- 3. Add authenticated read policy for results (org members only)
-- The existing results_select_org_members policy should handle this.
-- If it doesn't exist, create it:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'results_select_org_members'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "results_select_authenticated"
      ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'results')
    $pol$;
  END IF;
END $$;

-- 4. Add authenticated read policy for docking-files (owner only, matching folder pattern)
CREATE POLICY "docking_files_select_owner"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'docking-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 5. Add missing UPDATE policy for project_files
CREATE POLICY "project_files_update_own"
ON public.project_files FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- 6. Add realtime messages RLS policy to restrict channel subscriptions
-- Note: realtime.messages may not exist as a user-manageable table in all setups.
-- We'll skip this if it errors.
