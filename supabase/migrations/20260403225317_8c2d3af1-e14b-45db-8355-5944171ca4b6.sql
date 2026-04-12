
-- Enable realtime for jobs table
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
-- Enable realtime for org_credits table
ALTER PUBLICATION supabase_realtime ADD TABLE public.org_credits;
