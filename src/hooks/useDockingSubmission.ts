import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrgContext } from "@/contexts/OrgContext";
import { useDeductCredits } from "@/hooks/useCredits";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import type { DockingParams } from "@/components/docking/DockingParameterControls";

interface SubmitDockingArgs {
  receptor: string;
  ligand: string;
  ligandMode: string;
  bindingSite: string;
  engineName: string;
  creditCost: number;
  receptorStoragePath: string | null;
  ligandStoragePath: string | null;
  params?: DockingParams;
}

export function useDockingSubmission() {
  const { user } = useAuth();
  const { orgId } = useOrgContext();
  const deductCredits = useDeductCredits();
  const { retentionDays } = useSubscription();

  const submitJob = useCallback(async ({
    receptor,
    ligand,
    ligandMode,
    bindingSite,
    engineName,
    creditCost,
    receptorStoragePath,
    ligandStoragePath,
    params,
  }: SubmitDockingArgs) => {
    if (!user) throw new Error("You must be logged in");
    if (!orgId) throw new Error("No organization found");

    // Deduct credits
    await deductCredits.mutateAsync({ orgId, amount: creditCost });

    // Create DB record
    const expiresAt = new Date(Date.now() + retentionDays * 86_400_000).toISOString();
    const { data: dbRow, error: dbErr } = await supabase
      .from("docking_jobs")
      .insert({
        user_id: user.id,
        receptor,
        ligands: ligand,
        ligand_mode: ligandMode,
        binding_site: bindingSite,
        engine: engineName,
        status: "queued",
        estimated_credits: creditCost,
        receptor_file_url: receptorStoragePath,
        ligand_file_url: ligandStoragePath,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (dbErr || !dbRow) throw new Error(dbErr?.message ?? "Failed to create job");

    // Invoke edge function
    const { error: fnErr } = await supabase.functions.invoke("process-workflow", {
      body: { workflowType: "docking", recordId: dbRow.id },
    });

    if (fnErr) throw new Error("Simulation failed: " + fnErr.message);

    // Reload result
    const { data: updated, error: reloadErr } = await supabase
      .from("docking_jobs")
      .select("*")
      .eq("id", dbRow.id)
      .single();

    if (reloadErr || !updated) throw new Error("Could not retrieve results");

    return updated;
  }, [user, orgId, deductCredits, retentionDays]);

  return { submitJob };
}
