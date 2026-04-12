import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCredits(orgId: string | undefined) {
  return useQuery({
    queryKey: ["credits", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("org_credits")
        .select("*")
        .eq("org_id", orgId!)
        .maybeSingle();
      if (error) throw error;
      return data ?? { org_id: orgId, balance: 0, updated_at: new Date().toISOString() };
    },
  });
}

export function useDeductCredits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, amount }: { orgId: string; amount: number }) => {
      const { data, error } = await supabase.rpc("deduct_credits_for_job", {
        _org_id: orgId,
        _cost: amount,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { orgId }) => qc.invalidateQueries({ queryKey: ["credits", orgId] }),
  });
}
