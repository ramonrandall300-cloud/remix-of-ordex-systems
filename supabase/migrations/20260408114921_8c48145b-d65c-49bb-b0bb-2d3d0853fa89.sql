
-- Protein prediction jobs
CREATE INDEX IF NOT EXISTS idx_protein_jobs_user_created ON public.protein_prediction_jobs (user_id, created_at DESC);

-- Docking jobs  
CREATE INDEX IF NOT EXISTS idx_docking_jobs_user_created ON public.docking_jobs (user_id, created_at DESC);

-- SynBio designs
CREATE INDEX IF NOT EXISTS idx_synbio_user_created ON public.synbio_designs (user_id, created_at DESC);

-- CRISPR experiments
CREATE INDEX IF NOT EXISTS idx_crispr_exp_user_created ON public.crispr_experiments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crispr_exp_status ON public.crispr_experiments (status);

-- CRISPR guide designs
CREATE INDEX IF NOT EXISTS idx_crispr_guides_experiment ON public.crispr_guide_designs (experiment_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_crispr_guides_user ON public.crispr_guide_designs (user_id);

-- CRISPR edit logs
CREATE INDEX IF NOT EXISTS idx_crispr_logs_experiment ON public.crispr_edit_logs (experiment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crispr_logs_user ON public.crispr_edit_logs (user_id);

-- Cell cultures
CREATE INDEX IF NOT EXISTS idx_cell_cultures_user_created ON public.cell_cultures (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cell_cultures_org ON public.cell_cultures (org_id);

-- Culture logs
CREATE INDEX IF NOT EXISTS idx_culture_logs_culture ON public.culture_logs (culture_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_culture_logs_user ON public.culture_logs (user_id);

-- Culture AI analyses
CREATE INDEX IF NOT EXISTS idx_culture_ai_culture ON public.culture_ai_analyses (culture_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_culture_ai_user ON public.culture_ai_analyses (user_id);

-- Usage logs composite for org queries
CREATE INDEX IF NOT EXISTS idx_usage_logs_org_created ON public.usage_logs (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user ON public.usage_logs (user_id);

-- Jobs table
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_org_created ON public.jobs (org_id, created_at DESC);

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects (org_id);
CREATE INDEX IF NOT EXISTS idx_projects_user ON public.projects (user_id);

-- Project files
CREATE INDEX IF NOT EXISTS idx_project_files_project ON public.project_files (project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_user ON public.project_files (user_id);
