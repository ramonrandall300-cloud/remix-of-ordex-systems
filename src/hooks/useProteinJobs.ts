import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { useState } from "react";

export type ProteinJob = Tables<"protein_prediction_jobs">;

const PAGE_SIZE = 50;

export function useProteinJobs() {
  const [page, setPage] = useState(0);

  const query = useQuery({
    queryKey: ["protein_prediction_jobs", page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("protein_prediction_jobs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { data: data as ProteinJob[], total: count ?? 0 };
    },
  });

  return {
    ...query,
    data: query.data?.data,
    total: query.data?.total ?? 0,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    hasMore: (query.data?.total ?? 0) > (page + 1) * PAGE_SIZE,
  };
}

export function useCreateProteinJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (job: Omit<TablesInsert<"protein_prediction_jobs">, "id" | "created_at" | "updated_at" | "job_number">) => {
      const { data, error } = await supabase
        .from("protein_prediction_jobs")
        .insert(job)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["protein_prediction_jobs"] }),
  });
}

export function useUpdateProteinJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from("protein_prediction_jobs")
        .update({ name })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["protein_prediction_jobs"] }),
  });
}

export function useDeleteProteinJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("protein_prediction_jobs")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["protein_prediction_jobs"] }),
  });
}
