
-- Add expires_at to docking_jobs
ALTER TABLE public.docking_jobs
ADD COLUMN expires_at timestamp with time zone;

-- Add expires_at to protein_prediction_jobs
ALTER TABLE public.protein_prediction_jobs
ADD COLUMN expires_at timestamp with time zone;

-- Add expires_at to synbio_designs
ALTER TABLE public.synbio_designs
ADD COLUMN expires_at timestamp with time zone;

-- Function to clean up expired results
CREATE OR REPLACE FUNCTION public.cleanup_expired_results()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _deleted integer := 0;
  _count integer;
BEGIN
  DELETE FROM public.docking_jobs WHERE expires_at IS NOT NULL AND expires_at < now();
  GET DIAGNOSTICS _count = ROW_COUNT;
  _deleted := _deleted + _count;

  DELETE FROM public.protein_prediction_jobs WHERE expires_at IS NOT NULL AND expires_at < now();
  GET DIAGNOSTICS _count = ROW_COUNT;
  _deleted := _deleted + _count;

  DELETE FROM public.synbio_designs WHERE expires_at IS NOT NULL AND expires_at < now();
  GET DIAGNOSTICS _count = ROW_COUNT;
  _deleted := _deleted + _count;

  RETURN _deleted;
END;
$function$;
