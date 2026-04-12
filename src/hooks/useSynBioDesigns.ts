import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { useState } from "react";

export type SynBioDesign = Tables<"synbio_designs">;

const PAGE_SIZE = 50;

export function useSynBioDesigns() {
  const [page, setPage] = useState(0);

  const query = useQuery({
    queryKey: ["synbio_designs", page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("synbio_designs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { data: data as SynBioDesign[], total: count ?? 0 };
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

export function useCreateSynBioDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (design: Omit<TablesInsert<"synbio_designs">, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("synbio_designs")
        .insert(design)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["synbio_designs"] }),
  });
}
