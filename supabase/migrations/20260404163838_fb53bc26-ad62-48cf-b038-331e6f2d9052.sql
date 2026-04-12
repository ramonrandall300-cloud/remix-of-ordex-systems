
-- Add file URL columns to docking_jobs
ALTER TABLE public.docking_jobs
  ADD COLUMN receptor_file_url TEXT,
  ADD COLUMN ligand_file_url TEXT;

-- Create storage bucket for docking files
INSERT INTO storage.buckets (id, name, public)
VALUES ('docking-files', 'docking-files', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Docking files are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'docking-files');

-- Users can upload to their own folder
CREATE POLICY "Users can upload their own docking files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'docking-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own files
CREATE POLICY "Users can delete their own docking files"
ON storage.objects FOR DELETE
USING (bucket_id = 'docking-files' AND auth.uid()::text = (storage.foldername(name))[1]);
