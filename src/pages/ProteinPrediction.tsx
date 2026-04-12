// Protein Prediction Page
import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Filter, RefreshCw, Play, Save, Search, ExternalLink, Pencil, Trash2, Check, X } from "lucide-react";
import { CreditGate } from "@/components/CreditGate";
import { CreditCostPreview } from "@/components/CreditCostPreview";
import { CreditConfirmDialog } from "@/components/CreditConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { useProteinJobs, useUpdateProteinJob, useDeleteProteinJob } from "@/hooks/useProteinJobs";
import { useOrchestrateJob } from "@/hooks/useOrchestrateJob";
import { useJobPolling } from "@/hooks/useJobPolling";
import { useCredits } from "@/hooks/useCredits";
import { useOrgContext } from "@/contexts/OrgContext";
import { JobPollingIndicator } from "@/components/JobPollingIndicator";
import { BatchProteinSubmission } from "@/components/protein/BatchProteinSubmission";
import { ProteinResultsInspector } from "@/components/protein/ProteinResultsInspector";
import { SmartSequenceInput } from "@/components/protein/SmartSequenceInput";
import { ProteinAIPanel } from "@/components/protein/ProteinAIPanel";
import { MutationSimulator } from "@/components/protein/MutationSimulator";
import { ToolPageSkeleton } from "@/components/ToolPageSkeleton";
import { ToolPageError } from "@/components/ToolPageError";
import { toast } from "sonner";
import { getPrediction, getAnnotations, type AlphaFoldModel, type Annotation } from "@/lib/alphafold-api";

const modelColors: Record<string, string> = { ESMFold: "bg-primary", ESM: "bg-warning" };
const statusColors: Record<string, string> = {
  queued: "text-muted-foreground",
  running: "text-warning",
  completed: "text-success",
  failed: "text-destructive",
};

const STATUS_OPTIONS = ["all", "queued", "running", "completed", "failed"] as const;

export default function ProteinPrediction() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: jobs = [], isLoading, isError, refetch } = useProteinJobs();
  const updateJob = useUpdateProteinJob();
  const deleteJob = useDeleteProteinJob();
  const orchestrate = useOrchestrateJob();
  const jobPolling = useJobPolling();
  const { orgId } = useOrgContext();
  const { data: creditData } = useCredits(orgId);
  const creditBalance = creditData?.balance ?? 0;
  const [sequence, setSequenceRaw] = useState(() => {
    const saved = localStorage.getItem("protein-sequence");
    return saved !== null ? saved : ">P53_HUMAN\nMEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAM\nDDLMLSPDDIEQWFTEDPGPDE\nAFRMPEAAAPPVAPAPAAPTPAAPAPAPSWPLSSSVPSQKT\nYQGSYGFRLGFLHSGTAKSVTC";
  });
  const setSequence = (val: string) => {
    setSequenceRaw(val);
    localStorage.setItem("protein-sequence", val);
  };
  const [selectedModel, setSelectedModel] = useState<string>("ESMFold");
  const [predictionName, setPredictionName] = useState("");
  
  
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Edit state
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Delete confirmation
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [showCreditConfirm, setShowCreditConfirm] = useState(false);

  // UniProt / AlphaFold lookup state
  const [uniprotId, setUniprotId] = useState("");
  const [afLoading, setAfLoading] = useState(false);
  const [afModel, setAfModel] = useState<AlphaFoldModel | null>(null);
  const [afAnnotations, setAfAnnotations] = useState<Annotation[]>([]);

  const filteredJobs = statusFilter === "all" ? jobs : jobs.filter(j => j.status === statusFilter);

  const handleAlphaFoldLookup = async () => {
    const id = uniprotId.trim();
    if (!id) { toast.error("Enter a UniProt accession (e.g. P00533)"); return; }
    setAfLoading(true);
    setAfModel(null);
    setAfAnnotations([]);
    try {
      const [models, annotations] = await Promise.allSettled([
        getPrediction(id),
        getAnnotations(id),
      ]);
      if (models.status === "fulfilled" && models.value.length > 0) {
        setAfModel(models.value[0]);
        toast.success(`Found AlphaFold model for ${id}`);
      } else {
        toast.error(`No AlphaFold model found for ${id}`);
      }
      if (annotations.status === "fulfilled") {
        setAfAnnotations(annotations.value);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAfLoading(false);
    }
  };

  const handleSubmitClick = () => {
    if (!user) { toast.error("Please sign in to submit jobs"); return; }
    if (!sequence.trim()) { toast.error("Please enter a sequence"); return; }
    setShowCreditConfirm(true);
  };

  const handleSubmitConfirmed = () => {
    orchestrate.mutate({
      workflowType: "protein_prediction",
      sequence,
      model: selectedModel,
      ...(predictionName.trim() && { name: predictionName.trim() }),
    }, {
      onSuccess: (data) => {
        setSelectedJob(data.recordId);
        toast.success(`Job PROT-${data.jobNumber} queued — ${data.creditsCost} credits used`);
        jobPolling.track({ table: "protein_prediction_jobs", id: data.recordId, navigateTo: "/protein-prediction", label: `PROT-${data.jobNumber} Prediction` });
        refetch();
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleEditStart = (jobId: string, currentName: string) => {
    setEditingJobId(jobId);
    setEditName(currentName);
  };

  const handleEditSave = () => {
    if (!editingJobId || !editName.trim()) return;
    updateJob.mutate({ id: editingJobId, name: editName.trim() }, {
      onSuccess: () => { toast.success("Job renamed"); setEditingJobId(null); },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleDelete = (jobId: string) => {
    deleteJob.mutate(jobId, {
      onSuccess: () => {
        toast.success("Job deleted");
        setDeletingJobId(null);
        if (selectedJob === jobId) setSelectedJob(null);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const getStatusLabel = (job: typeof jobs[0]) => {
    if (job.status === "running") return `Running (${job.progress}%)`;
    if (job.status === "queued") return "Queued";
    if (job.status === "completed") return "Completed";
    if (job.status === "failed") return "Failed";
    return job.status;
  };

  if (isLoading) return <ToolPageSkeleton columns={2} />;
  if (isError) return <ToolPageError title="Failed to load predictions" message="We couldn't load your protein prediction jobs. Please try again." onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("tools.protein.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("tools.protein.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:auto-rows-auto">
        {/* Input Panel */}
        <div className="glass-card p-5 space-y-4">
          <h2 className="font-semibold text-foreground">{t("tools.protein.inputConfig")}</h2>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Prediction Name</label>
            <input
              value={predictionName}
              onChange={e => setPredictionName(e.target.value)}
              placeholder="e.g. EGFR Wild Type"
              className="w-full bg-secondary border border-border rounded-md px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">Optional — defaults to FASTA header if left blank</p>
          </div>

          <SmartSequenceInput value={sequence} onChange={setSequence} selectedModel={selectedModel} />

          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Model Selection</label>
            <div className="space-y-2">
              {[
                { id: "ESMFold", label: "ESMFold", desc: "Meta's ESM-2 language model for fast single-sequence folding", detail: "High speed • ≤400 residues • ~2 min" },
                { id: "AlphaFold2", label: "AlphaFold 2", desc: "DeepMind's structure prediction via AlphaFold DB (UniProt lookup)", detail: "High accuracy • Pre-computed • Instant" },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`w-full text-left p-3 rounded-md border transition-colors ${selectedModel === m.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{m.label}</span>
                    {selectedModel === m.id && <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">Active</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                  <p className="text-xs text-muted-foreground">{m.detail}</p>
                </button>
              ))}
             </div>
          </div>

          {/* AlphaFold 2 Lookup */}
          <div className="border-t border-border pt-4">
            <label className="text-xs text-muted-foreground mb-1 block">AlphaFold 2 — UniProt Lookup</label>
            <p className="text-xs text-muted-foreground mb-2">Fetch predicted structures & annotations from the AlphaFold DB</p>
            <div className="flex gap-2">
              <input
                value={uniprotId}
                onChange={e => setUniprotId(e.target.value)}
                placeholder="e.g. P00533 (EGFR)"
                className="flex-1 bg-secondary border border-border rounded-md px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                onKeyDown={e => e.key === "Enter" && handleAlphaFoldLookup()}
              />
              <button
                onClick={handleAlphaFoldLookup}
                disabled={afLoading}
                className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-md text-xs text-foreground hover:bg-secondary disabled:opacity-50"
              >
                {afLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                {afLoading ? "Loading..." : "Lookup"}
              </button>
            </div>
            {afModel && (
              <div className="mt-2 p-2 bg-secondary rounded-md space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">{afModel.uniprotAccession}</span>
                  <a href={`https://alphafold.ebi.ac.uk/entry/${afModel.uniprotAccession}`} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                    <ExternalLink className="w-3 h-3" /> AlphaFold DB
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">{afModel.uniprotDescription}</p>
                <p className="text-xs text-muted-foreground">{afModel.organismScientificName} • {afModel.uniprotEnd - afModel.uniprotStart + 1} residues</p>
              </div>
            )}
          </div>


          <CreditCostPreview balance={creditBalance} cost={50} estimatedTime="~2 minutes" />
          <CreditGate balance={creditBalance} cost={50} />

          <div className="flex gap-2">
            <CreditConfirmDialog
              open={showCreditConfirm}
              onOpenChange={setShowCreditConfirm}
              cost={50}
              balance={creditBalance}
              jobLabel={`Protein Prediction (${selectedModel})`}
              estimatedTime="~2 minutes"
              onConfirm={handleSubmitConfirmed}
            />
            <button
              onClick={handleSubmitClick}
              disabled={orchestrate.isPending || creditBalance < 50}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4" /> {orchestrate.isPending ? t("tools.protein.processing") : t("tools.protein.startJob")}
            </button>
            <button onClick={() => toast.success("Configuration saved as draft")} className="p-2.5 border border-border rounded-md text-muted-foreground hover:text-foreground transition-colors">
              <Save className="w-4 h-4" />
            </button>
          </div>

          {/* Mutation Simulator */}
          <MutationSimulator
            sequence={sequence}
            onSubmitMutant={(mutatedSeq) => {
              setSequence(mutatedSeq);
              toast.success("Mutant sequence loaded — click Start to predict");
            }}
            isSubmitting={orchestrate.isPending}
          />

          {/* AI Analysis */}
          <ProteinAIPanel
            sequence={sequence}
            jobName={selectedJob ? filteredJobs.find(j => j.id === selectedJob)?.name : undefined}
            plddtScore={selectedJob ? filteredJobs.find(j => j.id === selectedJob)?.plddt_score : undefined}
            plddtBindingDomain={selectedJob ? filteredJobs.find(j => j.id === selectedJob)?.plddt_binding_domain : undefined}
            resultMetrics={selectedJob ? (filteredJobs.find(j => j.id === selectedJob)?.result_metrics as Record<string, unknown> | null) : undefined}
          />

          {!user && (
            <p className="text-xs text-warning text-center">Sign in to submit and track jobs</p>
          )}
        </div>

        {/* Job Queue */}
        <div className="glass-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-foreground">{t("tools.protein.jobQueue")}</h2>
              <p className="text-xs text-muted-foreground">
                {isLoading ? "Loading..." : `${filteredJobs.length} jobs${statusFilter !== "all" ? ` (${statusFilter})` : ""}`}
              </p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 border rounded-md text-xs hover:bg-secondary ${
                    statusFilter !== "all" ? "border-primary text-primary" : "border-border text-foreground"
                  }`}
                >
                  <Filter className="w-3 h-3" />
                  <span className="hidden sm:inline">{statusFilter === "all" ? "Filter" : statusFilter}</span>
                </button>
                {showFilterMenu && (
                  <div className="absolute right-0 top-full mt-1 z-20 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[120px]">
                    {STATUS_OPTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => { setStatusFilter(s); setShowFilterMenu(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-secondary transition-colors capitalize ${
                          statusFilter === s ? "text-primary font-medium" : "text-foreground"
                        }`}
                      >
                        {s === "all" ? "All statuses" : s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => refetch()} className="flex items-center gap-1 px-2 sm:px-3 py-1.5 border border-border rounded-md text-xs text-foreground hover:bg-secondary"><RefreshCw className="w-3 h-3" /> <span className="hidden sm:inline">Refresh</span></button>
            </div>
          </div>

          {/* Close filter menu on outside click */}
          {showFilterMenu && <div className="fixed inset-0 z-10" onClick={() => setShowFilterMenu(false)} />}

          {filteredJobs.length === 0 && !isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {statusFilter !== "all" ? `No ${statusFilter} jobs` : t("tools.protein.noJobs")}
            </p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border">
                      <th className="text-left py-2 font-medium">ID</th>
                      <th className="text-left py-2 font-medium">Name</th>
                      <th className="text-left py-2 font-medium">Model</th>
                      <th className="text-left py-2 font-medium">Status</th>
                      <th className="text-left py-2 font-medium">Credits</th>
                      <th className="text-right py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.map(job => (
                      <tr
                        key={job.id}
                        onClick={() => setSelectedJob(job.id)}
                        className={`border-b border-border cursor-pointer hover:bg-secondary/50 ${selectedJob === job.id ? "bg-secondary" : ""}`}
                      >
                        <td className="py-2 text-foreground">PROT-{job.job_number}</td>
                        <td className="py-2 text-foreground">
                          {editingJobId === job.id ? (
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <input
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") handleEditSave(); if (e.key === "Escape") setEditingJobId(null); }}
                                className="bg-secondary border border-primary rounded px-1.5 py-0.5 text-xs text-foreground w-24 focus:outline-none"
                                autoFocus
                              />
                              <button onClick={handleEditSave} className="text-success hover:text-success/80"><Check className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setEditingJobId(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : job.name}
                        </td>
                        <td className="py-2"><span className={`px-1.5 py-0.5 rounded text-xs text-foreground ${modelColors[job.model] || "bg-muted"}`}>{job.model}</span></td>
                        <td className={`py-2 ${statusColors[job.status] || "text-foreground"}`}>
                          <span className="flex items-center gap-1">
                            {job.status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                            {getStatusLabel(job)}
                          </span>
                        </td>
                        <td className="py-2 text-foreground">{job.estimated_credits}</td>
                        <td className="py-2 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEditStart(job.id, job.name)}
                              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                              title="Rename"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {deletingJobId === job.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleDelete(job.id)} className="text-[10px] px-1.5 py-0.5 bg-destructive text-destructive-foreground rounded">Delete</button>
                                <button onClick={() => setDeletingJobId(null)} className="text-[10px] px-1.5 py-0.5 border border-border rounded text-muted-foreground">Cancel</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingJobId(job.id)}
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile card list */}
              <div className="md:hidden space-y-2">
                {filteredJobs.map(job => (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedJob === job.id ? "bg-secondary border-primary/25" : "border-border hover:bg-secondary/50"}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-foreground">PROT-{job.job_number}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${statusColors[job.status] || "text-foreground"}`}>
                          {job.status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse inline-block mr-1" />}
                          {getStatusLabel(job)}
                        </span>
                        <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleEditStart(job.id, job.name)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><Pencil className="w-3 h-3" /></button>
                          {deletingJobId === job.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleDelete(job.id)} className="text-[9px] px-1 py-0.5 bg-destructive text-destructive-foreground rounded">Yes</button>
                              <button onClick={() => setDeletingJobId(null)} className="text-[9px] px-1 py-0.5 border border-border rounded text-muted-foreground">No</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeletingJobId(job.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground"><Trash2 className="w-3 h-3" /></button>
                          )}
                        </div>
                      </div>
                    </div>
                    {editingJobId === job.id ? (
                      <div className="flex items-center gap-1 mb-1" onClick={e => e.stopPropagation()}>
                        <input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleEditSave(); if (e.key === "Escape") setEditingJobId(null); }}
                          className="bg-secondary border border-primary rounded px-1.5 py-0.5 text-xs text-foreground flex-1 focus:outline-none"
                          autoFocus
                        />
                        <button onClick={handleEditSave} className="text-success"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingJobId(null)} className="text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground truncate">{job.name}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className={`px-1.5 py-0.5 rounded ${modelColors[job.model] || "bg-muted"} text-foreground`}>{job.model}</span>
                      <span>{job.estimated_credits} credits</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Results Inspector */}
        <ProteinResultsInspector
          jobs={filteredJobs}
          selectedJobId={selectedJob}
          onJobSelect={setSelectedJob}
        />
      </div>
      <BatchProteinSubmission />
      <JobPollingIndicator tracking={jobPolling.tracking} />
    </div>
  );
}
