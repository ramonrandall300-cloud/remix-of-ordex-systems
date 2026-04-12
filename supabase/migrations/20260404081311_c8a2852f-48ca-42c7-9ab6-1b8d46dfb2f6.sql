
-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'system',
  read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, read) WHERE read = false;
CREATE INDEX idx_notifications_user_created ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "System inserts only"
ON public.notifications FOR INSERT
WITH CHECK (false);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Helper function for service-role inserts
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _title TEXT,
  _body TEXT DEFAULT NULL,
  _type TEXT DEFAULT 'system',
  _metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, body, type, metadata)
  VALUES (_user_id, _title, _body, _type, _metadata)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- Trigger: notify on protein job completion/failure
CREATE OR REPLACE FUNCTION public.notify_protein_job_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'completed' THEN
      PERFORM create_notification(
        NEW.user_id,
        'Protein prediction completed',
        format('Job #%s "%s" finished successfully.', NEW.job_number, NEW.name),
        'job_complete',
        jsonb_build_object('job_id', NEW.id, 'job_type', 'protein_prediction')
      );
    ELSIF NEW.status = 'failed' THEN
      PERFORM create_notification(
        NEW.user_id,
        'Protein prediction failed',
        format('Job #%s "%s" encountered an error.', NEW.job_number, NEW.name),
        'job_failed',
        jsonb_build_object('job_id', NEW.id, 'job_type', 'protein_prediction')
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protein_job_notify
AFTER UPDATE ON public.protein_prediction_jobs
FOR EACH ROW
EXECUTE FUNCTION public.notify_protein_job_status();

-- Trigger: notify on docking job completion/failure
CREATE OR REPLACE FUNCTION public.notify_docking_job_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'completed' THEN
      PERFORM create_notification(
        NEW.user_id,
        'Docking job completed',
        format('Job #%s finished with best score %.2f.', NEW.job_number, COALESCE(NEW.best_score, 0)),
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
$$;

CREATE TRIGGER trg_docking_job_notify
AFTER UPDATE ON public.docking_jobs
FOR EACH ROW
EXECUTE FUNCTION public.notify_docking_job_status();

-- Trigger: notify on team invite
CREATE OR REPLACE FUNCTION public.notify_invite_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_name TEXT;
  _admin RECORD;
BEGIN
  SELECT name INTO _org_name FROM public.organizations WHERE id = NEW.org_id;
  -- Notify all admins of the org about the invite
  FOR _admin IN
    SELECT user_id FROM public.org_members WHERE org_id = NEW.org_id AND role IN ('admin', 'owner')
  LOOP
    PERFORM create_notification(
      _admin.user_id,
      'New team invite sent',
      format('Invited %s to %s as %s.', NEW.email, COALESCE(_org_name, 'the organization'), NEW.role),
      'invite',
      jsonb_build_object('invite_id', NEW.id, 'email', NEW.email)
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_invite_notify
AFTER INSERT ON public.org_invites
FOR EACH ROW
EXECUTE FUNCTION public.notify_invite_created();
