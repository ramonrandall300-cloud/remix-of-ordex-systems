import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const PAGE_SIZE = 100;

export function useUsageLogs(orgId: string | undefined) {
  const [page, setPage] = useState(0);

  const query = useQuery({
    queryKey: ["usage_logs", orgId, page],
    enabled: !!orgId,
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("usage_logs")
        .select("*", { count: "exact" })
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { data: data ?? [], total: count ?? 0 };
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

export function useLogUsage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: {
      org_id: string;
      user_id: string;
      job_id?: string;
      credits_used: number;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from("usage_logs")
        .insert(log)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["usage_logs", vars.org_id] }),
  });
}
