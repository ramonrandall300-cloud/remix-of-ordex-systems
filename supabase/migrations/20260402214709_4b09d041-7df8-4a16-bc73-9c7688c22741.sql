
-- Organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Org members table (links users to orgs)
CREATE TABLE public.org_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- Credits table
CREATE TABLE public.credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

-- Jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  input JSONB,
  output JSONB,
  credits_cost INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Usage logs table
CREATE TABLE public.usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  credits_used INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to check org membership
CREATE OR REPLACE FUNCTION public.user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.org_members WHERE user_id = _user_id LIMIT 1
$$;

-- RLS policies for organizations
CREATE POLICY "Members can view their org"
  ON public.organizations FOR SELECT
  USING (id = public.user_org_id(auth.uid()));

CREATE POLICY "Members can update their org"
  ON public.organizations FOR UPDATE
  USING (id = public.user_org_id(auth.uid()));

-- RLS policies for org_members
CREATE POLICY "Members can view org members"
  ON public.org_members FOR SELECT
  USING (org_id = public.user_org_id(auth.uid()));

CREATE POLICY "Members can insert into their org"
  ON public.org_members FOR INSERT
  WITH CHECK (org_id = public.user_org_id(auth.uid()) OR user_id = auth.uid());

-- RLS policies for credits
CREATE POLICY "Members can view org credits"
  ON public.credits FOR SELECT
  USING (org_id = public.user_org_id(auth.uid()));

CREATE POLICY "Members can update org credits"
  ON public.credits FOR UPDATE
  USING (org_id = public.user_org_id(auth.uid()));

-- RLS policies for jobs
CREATE POLICY "Members can view org jobs"
  ON public.jobs FOR SELECT
  USING (org_id = public.user_org_id(auth.uid()));

CREATE POLICY "Members can create org jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (org_id = public.user_org_id(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Members can update org jobs"
  ON public.jobs FOR UPDATE
  USING (org_id = public.user_org_id(auth.uid()));

-- RLS policies for usage_logs
CREATE POLICY "Members can view org usage logs"
  ON public.usage_logs FOR SELECT
  USING (org_id = public.user_org_id(auth.uid()));

CREATE POLICY "Members can insert org usage logs"
  ON public.usage_logs FOR INSERT
  WITH CHECK (org_id = public.user_org_id(auth.uid()) AND user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credits_updated_at
  BEFORE UPDATE ON public.credits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
