
-- Cell cultures table
CREATE TABLE public.cell_cultures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  cell_line TEXT NOT NULL DEFAULT 'HEK293',
  passage_number INTEGER NOT NULL DEFAULT 1,
  seeding_density TEXT DEFAULT '1e5 cells/mL',
  medium TEXT NOT NULL DEFAULT 'DMEM + 10% FBS',
  temperature NUMERIC NOT NULL DEFAULT 37.0,
  co2_percent NUMERIC NOT NULL DEFAULT 5.0,
  humidity NUMERIC NOT NULL DEFAULT 95.0,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cell_cultures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cellcultures_select_own" ON public.cell_cultures FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cellcultures_insert_own" ON public.cell_cultures FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cellcultures_update_own" ON public.cell_cultures FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cellcultures_delete_own" ON public.cell_cultures FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_cell_cultures_updated_at
  BEFORE UPDATE ON public.cell_cultures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Culture observation logs
CREATE TABLE public.culture_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  culture_id UUID NOT NULL REFERENCES public.cell_cultures(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  confluence_percent NUMERIC,
  viability_percent NUMERIC,
  cell_count BIGINT,
  morphology_notes TEXT,
  ph NUMERIC,
  glucose_level NUMERIC,
  lactate_level NUMERIC,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.culture_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "culturelogs_select_own" ON public.culture_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "culturelogs_insert_own" ON public.culture_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "culturelogs_update_own" ON public.culture_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "culturelogs_delete_own" ON public.culture_logs FOR DELETE USING (auth.uid() = user_id);

-- AI analysis results
CREATE TABLE public.culture_ai_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  culture_id UUID NOT NULL REFERENCES public.cell_cultures(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  analysis_type TEXT NOT NULL,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_used TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  credits_cost INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.culture_ai_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cultureai_select_own" ON public.culture_ai_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cultureai_insert_blocked" ON public.culture_ai_analyses FOR INSERT WITH CHECK (false);
CREATE POLICY "cultureai_update_blocked" ON public.culture_ai_analyses FOR UPDATE USING (false);
CREATE POLICY "cultureai_delete_own" ON public.culture_ai_analyses FOR DELETE USING (auth.uid() = user_id);
