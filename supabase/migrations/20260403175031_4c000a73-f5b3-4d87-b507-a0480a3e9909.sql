
-- Enable extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Add retry tracking columns
ALTER TABLE public.protein_prediction_jobs
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_message text;

ALTER TABLE public.docking_jobs
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_message text;

-- Index for efficient polling of queued/failed jobs
CREATE INDEX IF NOT EXISTS idx_protein_jobs_status ON public.protein_prediction_jobs (status) WHERE status IN ('queued', 'failed');
CREATE INDEX IF NOT EXISTS idx_docking_jobs_status ON public.docking_jobs (status) WHERE status IN ('queued', 'failed');
