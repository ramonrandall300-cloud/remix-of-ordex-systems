CREATE OR REPLACE FUNCTION public.notify_docking_job_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'completed' THEN
      PERFORM create_notification(
        NEW.user_id,
        'Docking job completed',
        format('Job #%s finished with best score %s.', NEW.job_number, COALESCE(NEW.best_score::text, 'N/A')),
        'job_complete',
        jsonb_build_object('job_id', NEW.id, 'job_type', 'docking')
      );
    ELSIF NEW.status = 'failed' THEN
      PERFORM create_notification(
        NEW.user_id,
        'Docking job failed',
        format('Job #%s encountered an error.', NEW.job_number),
        'job_failed',
        jsonb_build_object('job_id', NEW.id, 'job_type', 'docking')
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;