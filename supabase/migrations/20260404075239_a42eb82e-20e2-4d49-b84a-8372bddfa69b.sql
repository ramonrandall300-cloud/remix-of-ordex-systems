
CREATE TABLE public.gpu_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  total_gpus integer NOT NULL DEFAULT 0,
  online_gpus integer NOT NULL DEFAULT 0,
  avg_utilization numeric NOT NULL DEFAULT 0,
  queued_jobs integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_gpu_snapshots_org_time ON public.gpu_snapshots (org_id, recorded_at DESC);

ALTER TABLE public.gpu_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gpusnapshots_select_members" ON public.gpu_snapshots
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "gpusnapshots_insert_blocked" ON public.gpu_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "gpusnapshots_update_blocked" ON public.gpu_snapshots
  FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "gpusnapshots_delete_blocked" ON public.gpu_snapshots
  FOR DELETE TO authenticated
  USING (false);
