
-- Allow authenticated users to read their own result files
CREATE POLICY "Users can read own result files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'results' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow service role uploads (already works via service key, but explicit for clarity)
CREATE POLICY "Users can upload own result files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'results' AND (storage.foldername(name))[1] = auth.uid()::text);
