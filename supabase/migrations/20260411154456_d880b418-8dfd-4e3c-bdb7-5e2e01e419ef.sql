
-- Create structure annotations table for per-residue annotations
CREATE TABLE public.structure_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pdb_id TEXT NOT NULL,
  residue_name TEXT,
  residue_number INTEGER,
  chain TEXT,
  note TEXT NOT NULL DEFAULT '',
  position_x NUMERIC,
  position_y NUMERIC,
  position_z NUMERIC,
  color TEXT NOT NULL DEFAULT '#2dd4bf',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.structure_annotations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "annotations_select_own"
ON public.structure_annotations FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "annotations_insert_own"
ON public.structure_annotations FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "annotations_update_own"
ON public.structure_annotations FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "annotations_delete_own"
ON public.structure_annotations FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Index for fast lookup
CREATE INDEX idx_structure_annotations_pdb ON public.structure_annotations(user_id, pdb_id);

-- Timestamp trigger
CREATE TRIGGER update_structure_annotations_updated_at
BEFORE UPDATE ON public.structure_annotations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
