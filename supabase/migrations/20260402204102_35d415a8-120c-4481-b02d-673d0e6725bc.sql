
-- Create timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Protein Prediction Jobs
CREATE TABLE public.protein_prediction_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_number SERIAL,
  name TEXT NOT NULL,
  sequence TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'AF3',
  gpu_type TEXT NOT NULL DEFAULT 'A100 (40GB)',
  priority TEXT NOT NULL DEFAULT 'Normal',
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  estimated_credits INTEGER NOT NULL DEFAULT 0,
  eta TEXT,
  plddt_score NUMERIC,
  plddt_binding_domain NUMERIC,
  result_pdb_url TEXT,
  result_metrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.protein_prediction_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own prediction jobs"
  ON public.protein_prediction_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own prediction jobs"
  ON public.protein_prediction_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prediction jobs"
  ON public.protein_prediction_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prediction jobs"
  ON public.protein_prediction_jobs FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_protein_prediction_jobs_updated_at
  BEFORE UPDATE ON public.protein_prediction_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Molecular Docking Jobs
CREATE TABLE public.docking_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_number SERIAL,
  receptor TEXT NOT NULL,
  ligands TEXT NOT NULL,
  ligand_mode TEXT NOT NULL DEFAULT 'single',
  binding_site TEXT NOT NULL DEFAULT 'Auto-detect pocket',
  engine TEXT NOT NULL DEFAULT 'AutoDock-GPU',
  gpu_type TEXT NOT NULL DEFAULT 'A100 (40GB)',
  priority TEXT NOT NULL DEFAULT 'Normal',
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  estimated_credits INTEGER NOT NULL DEFAULT 0,
  eta TEXT,
  best_score NUMERIC,
  poses JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.docking_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own docking jobs"
  ON public.docking_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own docking jobs"
  ON public.docking_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own docking jobs"
  ON public.docking_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own docking jobs"
  ON public.docking_jobs FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_docking_jobs_updated_at
  BEFORE UPDATE ON public.docking_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SynBio Designs
CREATE TABLE public.synbio_designs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sequence_type TEXT NOT NULL DEFAULT 'DNA',
  sequence TEXT NOT NULL,
  plasmid_type TEXT NOT NULL DEFAULT 'circular',
  assembly_method TEXT NOT NULL DEFAULT 'Gibson Assembly',
  host_organism TEXT NOT NULL DEFAULT 'E. coli',
  optimization_organism TEXT NOT NULL DEFAULT 'E. coli (K12)',
  cai_score NUMERIC,
  gc_content NUMERIC,
  feasibility_score NUMERIC,
  features JSONB,
  validation_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.synbio_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own synbio designs"
  ON public.synbio_designs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own synbio designs"
  ON public.synbio_designs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own synbio designs"
  ON public.synbio_designs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own synbio designs"
  ON public.synbio_designs FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_synbio_designs_updated_at
  BEFORE UPDATE ON public.synbio_designs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
