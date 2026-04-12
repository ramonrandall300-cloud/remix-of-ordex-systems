
-- Remove any existing policies on storage.objects for the results bucket
DROP POLICY IF EXISTS "Authenticated users can read results" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload results" ON storage.objects;
DROP POLICY IF EXISTS "users can read own org results" ON storage.objects;
DROP POLICY IF EXISTS "users can upload own org results" ON storage.objects;

-- Users can read files in their org's results folder
CREATE POLICY "users can read own org results"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'results'
  AND EXISTS (
    SELECT 1
    FROM public.org_members m
    WHERE m.org_id::text = (storage.foldername(name))[1]
    AND m.user_id = auth.uid()
  )
);

-- Users can upload files only to their own org/user path
CREATE POLICY "users can upload own org results"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'results'
  AND EXISTS (
    SELECT 1
    FROM public.org_members m
    WHERE m.org_id::text = (storage.foldername(name))[1]
    AND m.user_id = auth.uid()
  )
  AND (storage.foldername(name))[2] = auth.uid()::text
);
