
-- Ensure results bucket exists as private
INSERT INTO storage.buckets (id, name, public)
VALUES ('results', 'results', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "users can read own org results" ON storage.objects;
DROP POLICY IF EXISTS "users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "admins can delete org files" ON storage.objects;
DROP POLICY IF EXISTS "results_select_org_members" ON storage.objects;
DROP POLICY IF EXISTS "results_insert_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "results_update_own_files" ON storage.objects;
DROP POLICY IF EXISTS "results_delete_own_files" ON storage.objects;
DROP POLICY IF EXISTS "results_delete_admin" ON storage.objects;

-- SELECT: org members can read any file in their org folder
-- Path: results/{org_id}/{user_id}/{file}
-- foldername returns path segments: [org_id, user_id]
CREATE POLICY "results_select_org_members"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'results'
  AND public.is_org_member((storage.foldername(name))[1]::uuid)
);

-- INSERT: users can only upload into their own folder within their org
CREATE POLICY "results_insert_own_folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'results'
  AND public.is_org_member((storage.foldername(name))[1]::uuid)
  AND (storage.foldername(name))[2]::uuid = auth.uid()
);

-- UPDATE: users can only update their own files
CREATE POLICY "results_update_own_files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'results'
  AND public.is_org_member((storage.foldername(name))[1]::uuid)
  AND (storage.foldername(name))[2]::uuid = auth.uid()
);

-- DELETE: users can delete own files
CREATE POLICY "results_delete_own_files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'results'
  AND (storage.foldername(name))[2]::uuid = auth.uid()
);

-- DELETE: admins can delete any file in their org
CREATE POLICY "results_delete_admin"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'results'
  AND public.is_org_admin((storage.foldername(name))[1]::uuid)
);
