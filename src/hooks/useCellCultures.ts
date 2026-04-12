import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function useCellCultures() {
  const { user } = useAuth();

  const culturesQuery = useQuery({
    queryKey: ["cell_cultures", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cell_cultures")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  return culturesQuery;
}

export function useCultureLogs(cultureId: string | undefined) {
  return useQuery({
    queryKey: ["culture_logs", cultureId],
    enabled: !!cultureId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("culture_logs")
        .select("*")
        .eq("culture_id", cultureId!)
        .order("logged_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });
}

export function useCultureAnalyses(cultureId: string | undefined) {
  return useQuery({
    queryKey: ["culture_ai_analyses", cultureId],
    enabled: !!cultureId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("culture_ai_analyses")
        .select("*")
        .eq("culture_id", cultureId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCulture() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (values: {
      name: string;
      cell_line: string;
      passage_number: number;
      seeding_density: string;
      medium: string;
      temperature: number;
      co2_percent: number;
      humidity: number;
      notes?: string;
      org_id: string;
    }) => {
      const { data, error } = await supabase
        .from("cell_cultures")
        .insert({ ...values, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cell_cultures"] });
      toast.success("Culture created");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useUpdateCulture() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }: {
      id: string;
      name?: string;
      cell_line?: string;
      passage_number?: number;
      seeding_density?: string;
      medium?: string;
      temperature?: number;
      co2_percent?: number;
      humidity?: number;
      notes?: string;
      status?: string;
    }) => {
      const { data, error } = await supabase
        .from("cell_cultures")
        .update(values)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cell_cultures"] });
      toast.success("Culture updated");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useDeleteCulture() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cell_cultures")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cell_cultures"] });
      toast.success("Culture deleted");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useAddCultureLog() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (values: {
      culture_id: string;
      confluence_percent?: number;
      viability_percent?: number;
      cell_count?: number;
      morphology_notes?: string;
      ph?: number;
      glucose_level?: number;
      lactate_level?: number;
    }) => {
      const { data, error } = await supabase
        .from("culture_logs")
        .insert({ ...values, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["culture_logs", vars.culture_id] });
      toast.success("Observation logged");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useRunCultureAnalysis() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ cultureId, analysisType }: { cultureId: string; analysisType: string }) => {
      const { data, error } = await supabase.functions.invoke("cellculture-ai", {
        body: { cultureId, analysisType },
      });
      if (error) {
        try {
          const ctx = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (body?.error) throw new Error(body.error);
          }
        } catch (parseErr) {
          if (parseErr instanceof Error && parseErr.message !== error.message) throw parseErr;
        }
        throw error;
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["culture_ai_analyses"] });
      qc.invalidateQueries({ queryKey: ["credits"] });
      qc.invalidateQueries({ queryKey: ["usage_logs"] });
      toast.success(`AI analysis complete`);
    },
    onError: (err) => {
      if (err.message?.toLowerCase().includes("insufficient credits")) {
        toast.error("Insufficient credits", {
          action: { label: "Top Up", onClick: () => window.location.assign("/billing") },
        });
      } else {
        toast.error(err.message);
      }
    },
  });
}
