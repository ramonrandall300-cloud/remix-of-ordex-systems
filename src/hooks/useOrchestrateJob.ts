import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/contexts/OrgContext";
import { toast } from "sonner";

type WorkflowType = "protein_prediction" | "docking" | "synbio" | "crispr";

interface OrchestratePayload {
  workflowType: WorkflowType;
  [key: string]: unknown;
}

interface OrchestrateResult {
  success: boolean;
  recordId: string;
  jobNumber?: number;
  workflowType: WorkflowType;
  creditsCost: number;
  remainingCredits: number;
}

const queryKeyMap: Record<WorkflowType, string[]> = {
  protein_prediction: ["protein_prediction_jobs"],
  docking: ["docking_jobs"],
  synbio: ["synbio_designs"],
  crispr: ["crispr_experiments"],
};

export function useOrchestrateJob() {
  const qc = useQueryClient();
  const { orgId } = useOrgContext();

  return useMutation<OrchestrateResult, Error, OrchestratePayload>({
    mutationFn: async (payload) => {
      const { data, error } = await supabase.functions.invoke("orchestrate-job", {
        body: { ...payload, orgId },
      });
      if (error) {
        // Try to extract the real error message from the response body
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
      return data as OrchestrateResult;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeyMap[variables.workflowType] });
      qc.invalidateQueries({ queryKey: ["credits"] });
      qc.invalidateQueries({ queryKey: ["usage_logs"] });
    },
    onError: (err) => {
      if (err.message === "Unauthorized" || err.message?.toLowerCase().includes("unauthorized")) {
        toast.error("Please login again", {
          action: {
            label: "Login",
            onClick: () => window.location.assign("/auth"),
          },
        });
      } else if (err.message?.toLowerCase().includes("insufficient credits")) {
        toast.error("Insufficient credits — upgrade your plan to continue.", {
          action: {
            label: "Upgrade",
            onClick: () => window.location.assign("/choose-plan"),
          },
        });
      } else if (err.message?.toLowerCase().includes("too many requests")) {
        toast.error("You're submitting jobs too quickly. Please wait a moment.");
      }
    },
  });
}
