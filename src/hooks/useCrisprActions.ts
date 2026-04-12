import { toast } from "sonner";
import {
  useCreateExperiment,
  useCreateGuide,
  useSubmitAnalysis,
  useCreateLog,
  useUpdateExperimentStatus,
  useDeleteExperiment,
  type CrisprExperiment,
  type CrisprGuideDesign,
} from "@/hooks/useCrisprExperiments";

interface ExperimentFormData {
  name: string;
  target_gene?: string;
  organism: string;
  cas_variant: string;
  description?: string;
}

interface GuideSubmitData {
  experimentId: string;
  guideSequence: string;
  pamSequence: string;
  maxMismatches: number;
  organism: string;
  currentMaxVersion: number;
}

interface LogFormData {
  experimentId: string;
  guideDesignId?: string;
  logType: string;
  title: string;
  content?: string;
  metrics?: Record<string, unknown>;
}

export function useCrisprActions() {
  const createExp = useCreateExperiment();
  const createGuide = useCreateGuide();
  const submitAnalysis = useSubmitAnalysis();
  const createLog = useCreateLog();
  const updateStatus = useUpdateExperimentStatus();
  const deleteExp = useDeleteExperiment();

  async function handleCreateExperiment(data: ExperimentFormData) {
    if (!data.name.trim()) {
      toast.error("Name is required");
      return null;
    }
    try {
      const exp = await createExp.mutateAsync({
        name: data.name,
        target_gene: data.target_gene || undefined,
        organism: data.organism,
        cas_variant: data.cas_variant,
        description: data.description || undefined,
      });
      toast.success("Experiment created");
      return exp;
    } catch (e: any) {
      toast.error(e.message);
      return null;
    }
  }

  async function handleSubmitGuide(data: GuideSubmitData) {
    const seq = data.guideSequence.toUpperCase().replace(/[^ATGC]/g, "");
    if (seq.length < 17 || seq.length > 25) {
      toast.error("Guide must be 17-25 nt");
      return false;
    }

    try {
      const nextVersion = data.currentMaxVersion + 1;
      const guide = await createGuide.mutateAsync({
        experiment_id: data.experimentId,
        guide_sequence: seq,
        pam_sequence: data.pamSequence,
        version: nextVersion,
      });

      await createLog.mutateAsync({
        experiment_id: data.experimentId,
        guide_design_id: guide.id,
        log_type: "analysis",
        title: `Guide v${nextVersion} submitted for off-target analysis`,
        content: `Sequence: ${seq} | PAM: ${data.pamSequence} | Max mismatches: ${data.maxMismatches}`,
        metrics: {
          guide_length: seq.length,
          gc_content: (((seq.match(/[GC]/g) || []).length / seq.length) * 100).toFixed(1),
        },
      });

      toast.info("Submitting off-target analysis…");

      await submitAnalysis.mutateAsync({
        guideDesignId: guide.id,
        guideSequence: seq,
        pamSequence: data.pamSequence,
        organism: data.organism,
        maxMismatches: data.maxMismatches,
        experimentId: data.experimentId,
      });

      await createLog.mutateAsync({
        experiment_id: data.experimentId,
        guide_design_id: guide.id,
        log_type: "analysis",
        title: `Guide v${nextVersion} analysis completed`,
        content: `Off-target analysis finished. Check Version Timeline for results.`,
      });

      toast.success("Analysis complete!");
      return true;
    } catch (e: any) {
      toast.error(e.message);
      return false;
    }
  }

  async function handleAddLog(data: LogFormData) {
    if (!data.title.trim()) {
      toast.error("Title is required");
      return false;
    }
    try {
      await createLog.mutateAsync({
        experiment_id: data.experimentId,
        guide_design_id: data.guideDesignId,
        log_type: data.logType,
        title: data.title,
        content: data.content || undefined,
        metrics: data.metrics,
      });
      toast.success("Log entry added");
      return true;
    } catch (e: any) {
      toast.error(e.message);
      return false;
    }
  }

  async function handleStatusChange(
    experimentId: string,
    currentStatus: string,
    newStatus: string
  ) {
    try {
      await updateStatus.mutateAsync({ id: experimentId, status: newStatus });
      await createLog.mutateAsync({
        experiment_id: experimentId,
        log_type: "note",
        title: `Experiment status changed to "${newStatus}"`,
        content: `Status updated from "${currentStatus}" to "${newStatus}".`,
      });
      toast.success(`Status updated to ${newStatus}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleDeleteExperiment(id: string) {
    try {
      await deleteExp.mutateAsync(id);
      toast.success("Experiment deleted");
      return true;
    } catch (e: any) {
      toast.error(e.message);
      return false;
    }
  }

  return {
    handleCreateExperiment,
    handleSubmitGuide,
    handleAddLog,
    handleStatusChange,
    handleDeleteExperiment,
    isCreatingExp: createExp.isPending,
    isSubmittingGuide: createGuide.isPending || submitAnalysis.isPending,
    isAddingLog: createLog.isPending,
    isUpdatingStatus: updateStatus.isPending,
  };
}
