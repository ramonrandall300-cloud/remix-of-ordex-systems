
-- Remove duplicate inline-subquery policies on results bucket, keep helper-function ones
DROP POLICY IF EXISTS "users can upload own org results" ON storage.objects;
DROP POLICY IF EXISTS "users can update own org results" ON storage.objects;
DROP POLICY IF EXISTS "users can delete own org results" ON storage.objects;
