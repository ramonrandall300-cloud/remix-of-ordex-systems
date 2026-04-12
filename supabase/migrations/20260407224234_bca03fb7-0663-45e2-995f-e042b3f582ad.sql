
-- Trigger to protect system fields on docking_jobs from client updates
CREATE OR REPLACE FUNCTION public.protect_docking_system_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Preserve system-managed fields
  NEW.status := OLD.status;
  NEW.progress := OLD.progress;
  NEW.best_score := OLD.best_score;
  NEW.poses := OLD.poses;
  NEW.retry_count := OLD.retry_count;
  NEW.estimated_credits := OLD.estimated_credits;
  NEW.error_message := OLD.error_message;
  NEW.eta := OLD.eta;
  NEW.job_number := OLD.job_number;
  NEW.expires_at := OLD.expires_at;
  NEW.user_id := OLD.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_docking_fields
BEFORE UPDATE ON public.docking_jobs
FOR EACH ROW
WHEN (current_setting('role') != 'service_role')
EXECUTE FUNCTION public.protect_docking_system_fields();

-- Trigger to protect system fields on protein_prediction_jobs
CREATE OR REPLACE FUNCTION public.protect_protein_system_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.status := OLD.status;
  NEW.progress := OLD.progress;
  NEW.plddt_score := OLD.plddt_score;
  NEW.plddt_binding_domain := OLD.plddt_binding_domain;
  NEW.result_pdb_url := OLD.result_pdb_url;
  NEW.result_metrics := OLD.result_metrics;
  NEW.retry_count := OLD.retry_count;
  NEW.estimated_credits := OLD.estimated_credits;
  NEW.error_message := OLD.error_message;
  NEW.eta := OLD.eta;
  NEW.job_number := OLD.job_number;
  NEW.expires_at := OLD.expires_at;
  NEW.user_id := OLD.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_protein_fields
BEFORE UPDATE ON public.protein_prediction_jobs
FOR EACH ROW
WHEN (current_setting('role') != 'service_role')
EXECUTE FUNCTION public.protect_protein_system_fields();
