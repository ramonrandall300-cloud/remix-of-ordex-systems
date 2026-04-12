
INSERT INTO storage.buckets (id, name, public)
VALUES ('results', 'results', false);

CREATE POLICY "Authenticated users can read results"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'results');

CREATE POLICY "Authenticated users can upload results"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'results' AND auth.uid()::text = (storage.foldername(name))[1]);
