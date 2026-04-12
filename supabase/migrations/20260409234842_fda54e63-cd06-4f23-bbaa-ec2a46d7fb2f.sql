-- Allow authenticated users to read their own docking files
CREATE POLICY "Users can read own docking files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'docking-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to upload their own docking files
CREATE POLICY "Users can upload own docking files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'docking-files' AND (storage.foldername(name))[1] = auth.uid()::text);