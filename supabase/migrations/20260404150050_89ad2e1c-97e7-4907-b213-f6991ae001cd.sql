UPDATE storage.buckets SET public = true WHERE id = 'results';

CREATE POLICY "Public read access for results" ON storage.objects FOR SELECT USING (bucket_id = 'results');