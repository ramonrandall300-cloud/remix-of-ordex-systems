import { useState } from "react";
import { Upload, Play, FileText, X, Loader2, Lock } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { useOrchestrateJob } from "@/hooks/useOrchestrateJob";
import { useSubscription } from "@/hooks/useSubscription";
import { useCredits } from "@/hooks/useCredits";
import { useOrgContext } from "@/contexts/OrgContext";
import { toast } from "sonner";

interface BatchProteinJob {
  id: string;
  name: string;
  sequence: string;
  model: string;
  status: "pending" | "submitting" | "submitted" | "failed";
  error?: string;
}

const BATCH_TIERS = ["professional", "elite"];

export function BatchProteinSubmission() {
  const { tier } = useSubscription();
  const { orgId } = useOrgContext();
  const { data: creditData } = useCredits(orgId);
  const orchestrate = useOrchestrateJob();
  const [jobs, setJobs] = useState<BatchProteinJob[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasBatchAccess = tier && BATCH_TIERS.includes(tier);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.trim().split("\n");
        const header = lines[0]?.toLowerCase();

        // Support CSV: name,sequence,model  OR  FASTA format
        const isFasta = text.startsWith(">");

        const parsed: BatchProteinJob[] = [];

        if (isFasta) {
          // Parse FASTA format
          let currentName = "";
          let currentSeq = "";
          for (const line of lines) {
            if (line.startsWith(">")) {
              if (currentName && currentSeq) {
                parsed.push({
                  id: crypto.randomUUID(),
                  name: currentName,
                  sequence: currentSeq,
                  model: "AF3",
                  status: "pending",
                });
              }
              currentName = line.substring(1).trim().split(/\s+/)[0] || `Protein_${parsed.length + 1}`;
              currentSeq = "";
            } else {
              currentSeq += line.trim();
            }
          }
          if (currentName && currentSeq) {
            parsed.push({
              id: crypto.randomUUID(),
              name: currentName,
              sequence: currentSeq,
              model: "AF3",
              status: "pending",
            });
          }
        } else {
          // CSV format
          if (!header.includes("sequence")) {
            toast.error("CSV must have columns: name, sequence, model (optional)");
            return;
          }
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(",").map((c) => c.trim());
            if (cols.length < 2 || !cols[1]) continue;
            parsed.push({
              id: crypto.randomUUID(),
              name: cols[0] || `Protein_${i}`,
              sequence: cols[1],
              model: cols[2] || "AF3",
              status: "pending",
            });
          }
        }

        if (parsed.length === 0) {
          toast.error("No valid sequences found");
          return;
        }
        if (parsed.length > 50) {
          toast.error("Maximum 50 jobs per batch");
          return;
        }

        setJobs(parsed);
        toast.success(`Loaded ${parsed.length} prediction jobs`);
      } catch {
        toast.error("Failed to parse file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const removeJob = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const submitAll = async () => {
    if (jobs.length === 0) return;
    const costPerJob = 15;
    const totalCost = jobs.length * costPerJob;
    const balance = creditData?.balance ?? 0;

    if (balance < totalCost) {
      toast.error(`Insufficient credits. Need ${totalCost} but have ${balance}.`);
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;

    for (const job of jobs) {
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: "submitting" } : j))
      );
      try {
        await orchestrate.mutateAsync({
          workflowType: "protein_prediction",
          name: job.name,
          sequence: job.sequence,
          model: job.model,
          priority: "Normal",
        });
        setJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, status: "submitted" } : j))
        );
        successCount++;
      } catch (err: any) {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? { ...j, status: "failed", error: err.message || "Failed" }
              : j
          )
        );
      }
    }

    setIsSubmitting(false);
    toast.success(`Batch complete: ${successCount}/${jobs.length} jobs submitted`);
  };

  if (!hasBatchAccess) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <Lock className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
        <h3 className="text-sm font-semibold text-foreground mb-1">Batch Prediction Submission</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Submit multiple protein prediction jobs from a CSV or FASTA file. Available on Professional and Elite plans.
        </p>
        <a href="/choose-plan" className="text-xs text-primary hover:underline">
          Upgrade to unlock →
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Batch Prediction Submission
        </h3>
        <label className="flex items-center gap-2 text-xs text-primary hover:underline cursor-pointer">
          <Upload className="w-3.5 h-3.5" />
          Upload CSV / FASTA
          <input type="file" accept=".csv,.fasta,.fa,.faa" className="hidden" onChange={handleFileUpload} disabled={isSubmitting} />
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        CSV: <code className="bg-muted px-1 rounded text-[10px]">name,sequence,model</code> or FASTA format — max 50 sequences.
      </p>

      {jobs.length > 0 && (
        <>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {jobs.map((job, idx) => (
              <div key={job.id} className="flex items-center justify-between rounded bg-muted/50 px-3 py-1.5 text-xs">
                <span className="text-muted-foreground w-6">{idx + 1}.</span>
                <span className="flex-1 truncate text-foreground font-medium">{job.name}</span>
                <span className="text-muted-foreground mx-2 truncate max-w-[80px]">{job.sequence.substring(0, 12)}…</span>
                <span className="text-muted-foreground mx-1">{job.model}</span>
                <span className={`text-[10px] font-medium w-16 text-right ${
                  job.status === "submitted" ? "text-green-500" : job.status === "failed" ? "text-destructive" : job.status === "submitting" ? "text-warning" : "text-muted-foreground"
                }`}>
                  {job.status === "submitting" ? <Loader2 className="w-3 h-3 inline animate-spin" /> : job.status}
                </span>
                {job.status === "pending" && (
                  <DeleteConfirmDialog
                    title="Remove job?"
                    description={`Remove "${job.name}" from the batch queue?`}
                    onConfirm={() => removeJob(job.id)}
                    destructiveLabel="Remove"
                    trigger={
                      <button className="ml-2 text-muted-foreground hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    }
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{jobs.length} jobs · ~{jobs.length * 15} credits</span>
            <div className="flex items-center gap-2">
              <DeleteConfirmDialog
                title="Delete all jobs?"
                description={`This will remove all ${jobs.length} jobs from the batch queue. This cannot be undone.`}
                onConfirm={() => setJobs([])}
                destructiveLabel="Delete All"
                trigger={
                  <button
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Delete All
                  </button>
                }
              />
            <button
              onClick={submitAll}
              disabled={isSubmitting || jobs.every((j) => j.status !== "pending")}
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Submit All
            </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
