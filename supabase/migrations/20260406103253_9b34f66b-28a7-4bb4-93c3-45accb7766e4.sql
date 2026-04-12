
-- Create crispr_experiments table
CREATE TABLE public.crispr_experiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_gene TEXT,
  organism TEXT NOT NULL DEFAULT 'Homo sapiens',
  cas_variant TEXT NOT NULL DEFAULT 'Cas9',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.crispr_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crispr_experiments_select_own" ON public.crispr_experiments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "crispr_experiments_insert_own" ON public.crispr_experiments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "crispr_experiments_update_own" ON public.crispr_experiments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "crispr_experiments_delete_own" ON public.crispr_experiments FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_crispr_experiments_updated_at
  BEFORE UPDATE ON public.crispr_experiments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create crispr_guide_designs table
CREATE TABLE public.crispr_guide_designs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES public.crispr_experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  guide_sequence TEXT NOT NULL,
  pam_sequence TEXT NOT NULL DEFAULT 'NGG',
  strand TEXT DEFAULT '+',
  chromosome TEXT,
  position INTEGER,
  off_target_results JSONB,
  efficiency_score NUMERIC,
  specificity_score NUMERIC,
  risk_assessment TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crispr_guide_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crispr_guides_select_own" ON public.crispr_guide_designs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "crispr_guides_insert_own" ON public.crispr_guide_designs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "crispr_guides_update_own" ON public.crispr_guide_designs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "crispr_guides_delete_own" ON public.crispr_guide_designs FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime on guide designs for live progress
ALTER PUBLICATION supabase_realtime ADD TABLE public.crispr_guide_designs;

-- Create crispr_edit_logs table
CREATE TABLE public.crispr_edit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES public.crispr_experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  guide_design_id UUID REFERENCES public.crispr_guide_designs(id) ON DELETE SET NULL,
  log_type TEXT NOT NULL DEFAULT 'note',
  title TEXT NOT NULL,
  content TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  metrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crispr_edit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crispr_logs_select_own" ON public.crispr_edit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "crispr_logs_insert_own" ON public.crispr_edit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "crispr_logs_update_own" ON public.crispr_edit_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "crispr_logs_delete_own" ON public.crispr_edit_logs FOR DELETE USING (auth.uid() = user_id);
