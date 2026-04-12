import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type WorkflowType = "protein_prediction" | "docking" | "synbio";

const queryKeyMap: Record<WorkflowType, string> = {
  protein_prediction: "protein_prediction_jobs",
  docking: "docking_jobs",
  synbio: "synbio_designs",
};

export function useProcessWorkflow() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ workflowType, recordId }: { workflowType: WorkflowType; recordId: string }) => {
      const { data, error } = await supabase.functions.invoke("process-workflow", {
        body: { workflowType, recordId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [queryKeyMap[variables.workflowType]] });
    },
  });
}
