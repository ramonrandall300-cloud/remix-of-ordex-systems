import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrgContext } from "@/contexts/OrgContext";
import { useCredits } from "@/hooks/useCredits";
import { CreditGate } from "@/components/CreditGate";
import { CreditCostPreview } from "@/components/CreditCostPreview";
import { CreditConfirmDialog } from "@/components/CreditConfirmDialog";
import { ToolPageSkeleton } from "@/components/ToolPageSkeleton";
import { ToolPageError } from "@/components/ToolPageError";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { toast } from "sonner";
import PoseViewer3D from "@/components/docking/PoseViewer3D";
import { DockingAIPanel } from "@/components/docking/DockingAIPanel";
import { DockingReportExport } from "@/components/docking/DockingReportExport";
import { DockingParameterControls, DEFAULT_PARAMS } from "@/components/docking/DockingParameterControls";
import type { DockingParams } from "@/components/docking/DockingParameterControls";
import { useDockingFiles } from "@/hooks/useDockingFiles";
import { useDockingSubmission } from "@/hooks/useDockingSubmission";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const DOCKING_CREDIT_COST = 25;

const ENGINES = [
  { id: "autodock", name: "AutoDock Vina", desc: "High-speed docking", time: "~5 min", badge: "Fast", exhaustiveness: 16 },
  { id: "vina", name: "Vina", desc: "Classic algorithm", time: "~15 min", badge: "Standard", exhaustiveness: 8 },
  { id: "glide", name: "Glide SP", desc: "Schrödinger precision", time: "~20 min", badge: "SP", exhaustiveness: 24 },
];

const BINDING_SITES = ["Auto-detect pocket", "Manual coordinates", "Known active site", "Allosteric site"];

// ─── SUB-COMPONENTS ─────────────────────────────────────────────────────────

function Badge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 1,
        color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
        border: `1px solid ${active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}`,
        borderRadius: 4, padding: "2px 7px",
      }}
    >
      {label}
    </span>
  );
}

function DropZone({ label, onFile }: { label: string; onFile?: (file: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files[0]) onFile?.(e.dataTransfer.files[0]); }}
      style={{
        border: `1.5px dashed ${over ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
        borderRadius: 8, padding: "16px 12px", textAlign: "center", cursor: "pointer",
        background: over ? "hsl(var(--accent) / 0.15)" : "transparent", transition: "all 0.15s", marginBottom: 4,
      }}
    >
      <div style={{ fontSize: 18, marginBottom: 4, color: "hsl(var(--muted-foreground))" }}>⬆</div>
      <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 12 }}>{label}</div>
      <input ref={ref} type="file" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) onFile?.(e.target.files[0]); }} />
    </div>
  );
}

interface DockingJob {
  id: number;
  dbId?: string;
  jobNumber?: number;
  receptor: string;
  ligand: string;
  engine: string;
  submittedAt: string;
  status: "queued" | "running" | "completed" | "failed";
  output: any;
  error?: string;
  receptorFileUrl?: string | null;
  ligandFileUrl?: string | null;
  pdbContent?: string | null;
  sdfContent?: string | null;
}

function JobRow({ job, selected, onSelect, onDelete }: { job: DockingJob; selected: boolean; onSelect: (j: DockingJob) => void; onDelete: (j: DockingJob) => void }) {
  const colors: Record<string, string> = { completed: "hsl(var(--primary))", running: "hsl(var(--warning))", failed: "hsl(var(--destructive))", queued: "hsl(var(--muted-foreground))" };
  const labels: Record<string, string> = { completed: "✓ Done", running: "⟳ Running", failed: "✗ Failed", queued: "○ Queued" };
  return (
    <div onClick={() => onSelect(job)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, marginBottom: 6, cursor: "pointer", transition: "all 0.15s", background: selected ? "hsl(var(--accent) / 0.15)" : "hsl(var(--muted))", border: `1px solid ${selected ? "hsl(var(--primary) / 0.25)" : "hsl(var(--border))"}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ color: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}>{job.receptor} + {job.ligand?.slice(0, 30)}{(job.ligand?.length ?? 0) > 30 ? "…" : ""}</div>
        <div style={{ color: "hsl(var(--muted-foreground))", fontSize: 11, marginTop: 2 }}>{job.engine} • {job.submittedAt}</div>
      </div>
      <span style={{ color: colors[job.status], fontSize: 11, fontWeight: 700 }}>{labels[job.status]}</span>
      <DeleteConfirmDialog
        title="Delete docking job?"
        description={`This will permanently delete "${job.receptor} + ${job.ligand?.slice(0, 30)}".`}
        onConfirm={() => onDelete(job)}
        trigger={
          <button onClick={(e) => e.stopPropagation()} title="Delete job" style={{ marginLeft: 6, background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", fontSize: 14, lineHeight: 1, padding: "2px 4px", borderRadius: 4, transition: "color 0.15s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(var(--destructive))")} onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}>✕</button>
        }
      />
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function MolecularDocking() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { orgId } = useOrgContext();
  const { data: creditData } = useCredits(orgId);
  const creditBalance = creditData?.balance ?? 0;

  // Hooks
  const dockingFiles = useDockingFiles();
  const { submitJob } = useDockingSubmission();

  // Form state
  const [receptor, setReceptor] = useState("");
  const [ligand, setLigand] = useState("");
  const [ligandTab, setLigandTab] = useState("Single");
  const [bindingSite, setBindingSite] = useState("Auto-detect pocket");
  const [engine, setEngine] = useState("vina");
  const [center, setCenter] = useState<string[]>(["", "", ""]);
  const [dockingParams, setDockingParams] = useState<DockingParams>(() => ({ ...DEFAULT_PARAMS }));

  // Job state
  const [jobs, setJobs] = useState<DockingJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<DockingJob | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [showCreditConfirm, setShowCreditConfirm] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const selectedEngine = ENGINES.find((e) => e.id === engine) ?? ENGINES[0];

  // Derived data
  const pdbData = selectedJob?.pdbContent ?? undefined;
  const sdfData = selectedJob?.sdfContent ?? undefined;

  // ─── Unified patch helper ──────────────────────────────────────────────────
  const patchJob = useCallback((id: number, patch: Partial<DockingJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
    setSelectedJob((prev) => (prev?.id === id ? { ...prev, ...patch } : prev));
  }, []);

  // ─── Fetch storage files for old jobs ──────────────────────────────────────
  useEffect(() => {
    if (!selectedJob || selectedJob.status !== "completed") return;
    if (selectedJob.pdbContent || selectedJob.sdfContent) return;

    (async () => {
      const { pdb, sdf } = await dockingFiles.fetchStorageFiles(selectedJob.receptorFileUrl, selectedJob.ligandFileUrl);
      if (pdb || sdf) patchJob(selectedJob.id, { pdbContent: pdb, sdfContent: sdf });
    })();
  }, [selectedJob?.id, selectedJob?.status]);

  // ─── Load jobs from DB ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setLoadingJobs(false); return; }
    setLoadingJobs(true);
    setLoadError(false);
    (async () => {
      const { data, error } = await supabase
        .from("docking_jobs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error || !data) { setLoadingJobs(false); setLoadError(true); return; }

      setJobs(data.map((row) => ({
        id: Date.now() + Math.random(),
        dbId: row.id,
        jobNumber: row.job_number,
        receptor: row.receptor,
        ligand: row.ligands,
        engine: row.engine,
        submittedAt: new Date(row.created_at).toLocaleString(),
        status: row.status === "completed" ? "completed" : row.status === "failed" ? "failed" : "queued",
        output: row.status === "completed" ? { best_score: row.best_score, poses: row.poses } : null,
        error: row.error_message ?? undefined,
        receptorFileUrl: row.receptor_file_url,
        ligandFileUrl: row.ligand_file_url,
      })));
      setLoadingJobs(false);
    })();
  }, [user]);

  const deleteJob = useCallback(async (job: DockingJob) => {
    if (job.dbId) {
      const { error } = await supabase.from("docking_jobs").delete().eq("id", job.dbId);
      if (error) { toast.error("Failed to delete job"); return; }
    }
    setJobs((prev) => prev.filter((j) => j.id !== job.id));
    setSelectedJob((prev) => (prev?.id === job.id ? null : prev));
    toast.success("Job deleted");
  }, []);

  function handleDockingClick() {
    setError("");
    const rec = receptor.trim() || dockingFiles.receptorFile?.name;
    const lig = ligand.trim() || dockingFiles.ligandFile?.name;
    if (!rec) { setError("Receptor is required"); return; }
    if (!lig) { setError("Ligand is required"); return; }
    if (!user) { setError("You must be logged in"); return; }
    if (!orgId) { setError("No organization found"); return; }
    if (creditBalance < DOCKING_CREDIT_COST) { setError(`Insufficient credits (${creditBalance} available, ${DOCKING_CREDIT_COST} required)`); return; }

    const cx = parseFloat(center[0]);
    const cy = parseFloat(center[1]);
    const cz = parseFloat(center[2]);
    const hasCenter = !isNaN(cx) && !isNaN(cy) && !isNaN(cz);
    if (!hasCenter && bindingSite !== "Auto-detect pocket") { setError("Center X, Y, Z coordinates required for manual binding site"); return; }

    setShowCreditConfirm(true);
  }

  async function handleStartDocking() {
    const rec = receptor.trim() || dockingFiles.receptorFile?.name;
    const lig = ligand.trim() || dockingFiles.ligandFile?.name;
    setError("");
    setStarting(true);

    try {
      const { receptorPath, ligandPath } = await dockingFiles.uploadFiles();

      const jobId = Date.now();
      const newJob: DockingJob = {
        id: jobId,
        receptor: rec!,
        ligand: lig!,
        engine: selectedEngine.name,
        submittedAt: new Date().toLocaleTimeString(),
        status: "running",
        output: null,
        receptorFileUrl: receptorPath,
        ligandFileUrl: ligandPath,
        pdbContent: dockingFiles.localPdbContent,
        sdfContent: dockingFiles.localSdfContent,
      };
      setJobs((prev) => [newJob, ...prev]);
      setSelectedJob(newJob);

      const updated = await submitJob({
        receptor: rec!,
        ligand: lig!,
        ligandMode: ligandTab.toLowerCase(),
        bindingSite,
        engineName: selectedEngine.name,
        creditCost: DOCKING_CREDIT_COST,
        receptorStoragePath: receptorPath,
        ligandStoragePath: ligandPath,
        params: dockingParams,
      });

      if (updated.status === "completed") {
        patchJob(jobId, {
          dbId: updated.id,
          jobNumber: updated.job_number,
          status: "completed",
          output: { best_score: updated.best_score, poses: updated.poses },
          receptorFileUrl: updated.receptor_file_url ?? receptorPath,
          ligandFileUrl: updated.ligand_file_url ?? ligandPath,
          pdbContent: dockingFiles.localPdbContent,
          sdfContent: dockingFiles.localSdfContent,
        });
        toast.success("Docking simulation completed");
      } else {
        patchJob(jobId, { dbId: updated.id, jobNumber: updated.job_number, status: "failed", error: updated.error_message ?? "Simulation returned no results" });
        toast.error("Docking simulation failed");
      }
    } catch (err: any) {
      setError(`Failed: ${err.message}`);
      toast.error(err.message);
    } finally {
      setStarting(false);
    }
  }

  const poseViewerJob = useMemo(() => {
    if (!selectedJob) return undefined;
    return {
      receptor: selectedJob.receptor,
      ligand: selectedJob.ligand,
      engine: selectedJob.engine,
      bestScore: selectedJob.output?.best_score,
      poses: (selectedJob.output?.poses ?? []).map((p: any, i: number) => ({
        id: p.rank ?? i + 1,
        score: p.score ?? 0,
        rmsd: p.rmsd ?? 0,
        interactions: p.interactions?.length ?? 0,
      })),
    };
  }, [selectedJob?.id, selectedJob?.status, selectedJob?.output]);

  if (loadingJobs) return <ToolPageSkeleton columns={2} />;
  if (loadError) return <ToolPageError title="Failed to load docking jobs" message="We couldn't load your docking jobs. Please try again." onRetry={() => window.location.reload()} />;

  const completedSelected = selectedJob?.status === "completed";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t("tools.docking.title")}</h1>
        <p className="text-xs sm:text-sm text-primary mt-1">{t("tools.docking.subtitle", { cost: DOCKING_CREDIT_COST })}</p>
      </div>

      <div className="bg-accent/15 border border-primary/25 rounded-lg p-3 sm:p-4 text-xs text-muted-foreground">
        <strong className="text-primary">🔬 Real Computation</strong> — Fetches real protein structures from RCSB PDB and real ligand properties from PubChem. {DOCKING_CREDIT_COST} credits per docking job.
      </div>

      <CreditGate balance={creditBalance} cost={DOCKING_CREDIT_COST} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Input & Config ─────────────────────────────────── */}
        <div className="glass-card p-4 sm:p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground">{t("tools.docking.inputConfig")}</h2>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1">Receptor</label>
            <input value={receptor} onChange={(e) => setReceptor(e.target.value)} placeholder="e.g. 1IEP or receptor name" className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-1" />
            <DropZone label={dockingFiles.receptorFile ? dockingFiles.receptorFile.name : "Drop PDB/mmCIF file or click to browse"} onFile={dockingFiles.setReceptorFile} />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1">Ligand</label>
            <div className="flex gap-1.5 mb-2">
              {["Single", "Library"].map((tab) => (
                <button key={tab} onClick={() => setLigandTab(tab)} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${ligandTab === tab ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{tab}</button>
              ))}
            </div>
            <input value={ligand} onChange={(e) => setLigand(e.target.value)} placeholder="SMILES string e.g. CC(=O)Oc1ccccc1C(=O)O" className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-1" />
            <DropZone label={dockingFiles.ligandFile ? dockingFiles.ligandFile.name : "Drop SDF/MOL file or SMILES text"} onFile={dockingFiles.setLigandFile} />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1">Binding Site Center (X, Y, Z)</label>
            <div className="grid grid-cols-3 gap-2">
              {(["X", "Y", "Z"] as const).map((axis, i) => (
                <input key={axis} value={center[i]} onChange={(e) => setCenter((prev) => { const n = [...prev]; n[i] = e.target.value; return n; })} placeholder={axis} className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1">Binding Site</label>
            <select value={bindingSite} onChange={(e) => setBindingSite(e.target.value)} className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary">
              {BINDING_SITES.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1">Docking Engine</label>
            <div className="space-y-2">
              {ENGINES.map((eng) => (
                <button key={eng.id} onClick={() => { setEngine(eng.id); setDockingParams((p) => ({ ...p, exhaustiveness: eng.exhaustiveness })); }} className={`w-full text-left p-3 rounded-lg border transition-colors ${engine === eng.id ? "border-primary/35 bg-accent/15" : "border-border bg-muted hover:border-primary/20"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-foreground">{eng.name}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{eng.desc} • {eng.time}</p>
                    </div>
                    <Badge label={eng.badge} active={engine === eng.id} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Parameters (collapsible) */}
          <DockingParameterControls params={dockingParams} onChange={setDockingParams} engineId={engine} />

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-destructive text-xs">✗ {error}</div>
          )}

          <CreditCostPreview balance={creditBalance} cost={DOCKING_CREDIT_COST} estimatedTime={selectedEngine.time} />
          <CreditConfirmDialog open={showCreditConfirm} onOpenChange={setShowCreditConfirm} cost={DOCKING_CREDIT_COST} balance={creditBalance} jobLabel={`Molecular Docking (${selectedEngine.name})`} estimatedTime={selectedEngine.time} onConfirm={handleStartDocking} />

          <button onClick={handleDockingClick} disabled={starting || creditBalance < DOCKING_CREDIT_COST} className="w-full py-3.5 bg-primary text-primary-foreground font-bold text-sm rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_18px_hsl(var(--primary)/0.2)]">
            {starting ? t("tools.docking.computing") : `▷ ${t("tools.docking.startDocking", { cost: DOCKING_CREDIT_COST })}`}
          </button>
        </div>

        {/* ── Job Queue ──────────────────────────────────────── */}
        <div className="glass-card p-4 sm:p-5">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-foreground">{t("tools.docking.batchJobs")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{jobs.length} job{jobs.length !== 1 ? "s" : ""}</p>
          </div>
          {jobs.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">{t("tools.docking.noDockingJobs")}</p>
          ) : (
            <div className="space-y-1.5">
              {jobs.map((job) => (
                <JobRow key={job.id} job={job} selected={selectedJob?.id === job.id} onSelect={setSelectedJob} onDelete={deleteJob} />
              ))}
            </div>
          )}
        </div>

        {/* ── Results / 3D Viewer ────────────────────────────── */}
        <div className="glass-card p-4 sm:p-5 space-y-4">
          <PoseViewer3D job={poseViewerJob} pdbData={pdbData} sdfData={sdfData} />

          {/* Tabbed panels below viewer */}
          <Tabs defaultValue="ai" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="ai" className="flex-1 text-xs">AI Analysis</TabsTrigger>
              <TabsTrigger value="export" className="flex-1 text-xs">Export</TabsTrigger>
            </TabsList>
            <TabsContent value="ai">
              <DockingAIPanel
                receptor={completedSelected ? selectedJob?.receptor : undefined}
                ligand={completedSelected ? selectedJob?.ligand : undefined}
                engine={completedSelected ? selectedJob?.engine : undefined}
                bestScore={completedSelected ? selectedJob?.output?.best_score : undefined}
                poses={completedSelected ? selectedJob?.output?.poses : undefined}
              />
            </TabsContent>
            <TabsContent value="export">
              <DockingReportExport
                receptor={completedSelected ? selectedJob?.receptor : undefined}
                ligand={completedSelected ? selectedJob?.ligand : undefined}
                engine={completedSelected ? selectedJob?.engine : undefined}
                bestScore={completedSelected ? selectedJob?.output?.best_score : undefined}
                poses={completedSelected ? selectedJob?.output?.poses : undefined}
                jobNumber={completedSelected ? selectedJob?.jobNumber : undefined}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
