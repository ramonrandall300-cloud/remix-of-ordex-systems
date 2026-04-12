import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface Job {
  id: string;
  org_id: string;
  user_id: string;
  type: string;
  status: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  credits_cost: number;
  created_at: string;
  updated_at: string;
}

export function useJobsByOrg(orgId: string | undefined) {
  return useQuery({
    queryKey: ["jobs", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Job[];
    },
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (job: {
      org_id: string;
      user_id: string;
      type: string;
      input?: Json;
      credits_cost?: number;
    }) => {
      const { data, error } = await supabase
        .from("jobs")
        .insert([job])
        .select()
        .single();
      if (error) throw error;
      return data as Job;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["jobs", data.org_id] }),
  });
}

export function useUpdateJobStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, status, output }: { jobId: string; status: string; output?: Json }) => {
      const updates: { status: string; output?: Json } = { status };
      if (output !== undefined) updates.output = output;
      const { data, error } = await supabase
        .from("jobs")
        .update(updates)
        .eq("id", jobId)
        .select()
        .single();
      if (error) throw error;
      return data as Job;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["jobs", data.org_id] }),
  });
}
