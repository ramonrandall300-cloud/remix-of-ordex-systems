import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { useState } from "react";

export type DockingJob = Tables<"docking_jobs">;

const PAGE_SIZE = 50;

export function useDockingJobs() {
  const [page, setPage] = useState(0);

  const query = useQuery({
    queryKey: ["docking_jobs", page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("docking_jobs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { data: data as DockingJob[], total: count ?? 0 };
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

export function useCreateDockingJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (job: Omit<TablesInsert<"docking_jobs">, "id" | "created_at" | "updated_at" | "job_number">) => {
      const { data, error } = await supabase
        .from("docking_jobs")
        .insert(job)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["docking_jobs"] }),
  });
}
