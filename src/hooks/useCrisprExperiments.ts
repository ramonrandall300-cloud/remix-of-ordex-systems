import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export interface CrisprExperiment {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  target_gene: string | null;
  organism: string;
  cas_variant: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CrisprGuideDesign {
  id: string;
  experiment_id: string;
  user_id: string;
  version: number;
  guide_sequence: string;
  pam_sequence: string;
  strand: string | null;
  chromosome: string | null;
  position: number | null;
  off_target_results: any;
  efficiency_score: number | null;
  specificity_score: number | null;
  risk_assessment: string | null;
  status: string;
  created_at: string;
}

export interface CrisprEditLog {
  id: string;
  experiment_id: string;
  user_id: string;
  guide_design_id: string | null;
  log_type: string;
  title: string;
  content: string | null;
  attachments: any;
  metrics: any;
  created_at: string;
}

export function useCrisprExperiments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["crispr_experiments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crispr_experiments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as CrisprExperiment[];
    },
  });
}

export function useCrisprGuides(experimentId: string | undefined) {
  return useQuery({
    queryKey: ["crispr_guides", experimentId],
    enabled: !!experimentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crispr_guide_designs")
        .select("*")
        .eq("experiment_id", experimentId!)
        .order("version", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as CrisprGuideDesign[];
    },
  });
}

export function useCrisprLogs(experimentId: string | undefined) {
  return useQuery({
    queryKey: ["crispr_logs", experimentId],
    enabled: !!experimentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crispr_edit_logs")
        .select("*")
        .eq("experiment_id", experimentId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as CrisprEditLog[];
    },
  });
}

export function useCreateExperiment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { name: string; target_gene?: string; organism?: string; cas_variant?: string; description?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("crispr_experiments")
        .insert({ user_id: user.id, ...input })
        .select()
        .single();
      if (error) throw error;
      return data as CrisprExperiment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crispr_experiments"] }),
  });
}

export function useCreateGuide() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { experiment_id: string; guide_sequence: string; pam_sequence?: string; version: number }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("crispr_guide_designs")
        .insert({ user_id: user.id, ...input })
        .select()
        .single();
      if (error) throw error;
      return data as CrisprGuideDesign;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["crispr_guides", vars.experiment_id] }),
  });
}

export function useSubmitAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { guideDesignId: string; guideSequence: string; pamSequence: string; organism: string; maxMismatches: number; experimentId: string }) => {
      const { data, error } = await supabase.functions.invoke("crispr-analysis", {
        body: {
          guideDesignId: input.guideDesignId,
          guideSequence: input.guideSequence,
          pamSequence: input.pamSequence,
          organism: input.organism,
          maxMismatches: input.maxMismatches,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { ...data, experimentId: input.experimentId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crispr_guides", data.experimentId] });
    },
  });
}

export function useCreateLog() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { experiment_id: string; guide_design_id?: string; log_type: string; title: string; content?: string; metrics?: any }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("crispr_edit_logs")
        .insert({ user_id: user.id, ...input })
        .select()
        .single();
      if (error) throw error;
      return data as CrisprEditLog;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["crispr_logs", vars.experiment_id] }),
  });
}

export function useUpdateExperimentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from("crispr_experiments")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as CrisprExperiment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crispr_experiments"] }),
  });
}

export function useDeleteExperiment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crispr_experiments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crispr_experiments"] }),
  });
}

// Realtime subscription for guide design updates
export function useCrisprRealtime(experimentId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!experimentId) return;
    const channel = supabase
      .channel(`crispr-guides-${experimentId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "crispr_guide_designs",
        filter: `experiment_id=eq.${experimentId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["crispr_guides", experimentId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [experimentId, qc]);
}
