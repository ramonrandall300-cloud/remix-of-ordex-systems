import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { ArrowUp, ArrowDown, CheckCircle, PlayCircle, MessageSquare, AlertCircle, CreditCard, Play, Zap, FlaskConical, Dna, Atom } from "lucide-react";
import { useProteinJobs } from "@/hooks/useProteinJobs";
import { useDockingJobs } from "@/hooks/useDockingJobs";
import { useSynBioDesigns } from "@/hooks/useSynBioDesigns";
import { useAuth } from "@/hooks/useAuth";
import { useOrgContext } from "@/contexts/OrgContext";
import { useCredits } from "@/hooks/useCredits";
import { useUsageLogs } from "@/hooks/useUsageLogs";
import { useOrchestrateJob } from "@/hooks/useOrchestrateJob";
import { useJobPolling } from "@/hooks/useJobPolling";
import { JobPollingIndicator } from "@/components/JobPollingIndicator";
import { useOrgRealtime } from "@/hooks/useOrgRealtime";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const { user } = useAuth();
  const { activeOrg, orgId } = useOrgContext();
  const { data: creditData, refetch: refetchCredits } = useCredits(orgId);
  const { data: proteinJobs = [], refetch: refetchProtein } = useProteinJobs();
  const { data: dockingJobs = [], refetch: refetchDocking } = useDockingJobs();
  const { data: synbioDesigns = [], refetch: refetchSynbio } = useSynBioDesigns();
  const { data: usageLogs = [] } = useUsageLogs(orgId);
  const orchestrate = useOrchestrateJob();
  const jobPolling = useJobPolling();

  const [quickWorkflow, setQuickWorkflow] = useState<"protein" | "docking" | "synbio">("protein");
  const [quickInput, setQuickInput] = useState("");

  const realtimeSubs = useMemo(() => [
    { table: "jobs", onMessage: () => { refetchProtein(); refetchDocking(); } },
    { table: "org_credits", onMessage: () => refetchCredits() },
  ], [refetchProtein, refetchDocking, refetchCredits]);
  useOrgRealtime(orgId, realtimeSubs);

  const activeJobs = [...proteinJobs, ...dockingJobs].filter(j => j.status === "running" || j.status === "queued").length;
  const completedJobs = [...proteinJobs, ...dockingJobs].filter(j => j.status === "completed").length;
  const totalItems = proteinJobs.length + dockingJobs.length + synbioDesigns.length;
  const creditsBalance = creditData?.balance ?? 0;

  const activityFeed = [
    ...proteinJobs.slice(0, 3).map(j => ({
      icon: j.status === "completed" ? CheckCircle : j.status === "running" ? PlayCircle : AlertCircle,
      color: j.status === "completed" ? "text-success" : j.status === "running" ? "text-info" : "text-muted-foreground",
      label: t("dashboard.proteinStatus", { status: j.status }),
      detail: `PROT-${j.job_number} • ${j.name}`,
      time: new Date(j.created_at).toLocaleString(),
    })),
    ...dockingJobs.slice(0, 3).map(j => ({
      icon: j.status === "completed" ? CheckCircle : j.status === "running" ? PlayCircle : AlertCircle,
      color: j.status === "completed" ? "text-success" : j.status === "running" ? "text-info" : "text-muted-foreground",
      label: t("dashboard.dockingStatus", { status: j.status }),
      detail: `DOCK-${j.job_number} • ${j.receptor}`,
      time: new Date(j.created_at).toLocaleString(),
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  if (activityFeed.length === 0) {
    activityFeed.push({
      icon: MessageSquare,
      color: "text-muted-foreground",
      label: t("dashboard.noActivity"),
      detail: t("dashboard.firstJob"),
      time: "",
    });
  }

  const allJobs = [
    ...proteinJobs.map(j => ({ id: `PROT-${j.job_number}`, type: t("dashboard.protein"), name: j.name, status: j.status, progress: j.progress, credits: j.estimated_credits, created: j.created_at })),
    ...dockingJobs.map(j => ({ id: `DOCK-${j.job_number}`, type: t("dashboard.docking"), name: j.receptor, status: j.status, progress: j.progress, credits: j.estimated_credits, created: j.created_at })),
  ].sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

  const handleQuickSubmit = () => {
    if (!user) { toast.error("Please sign in"); return; }
    if (!quickInput.trim()) { toast.error("Please enter input"); return; }

    if (quickWorkflow === "protein") {
      orchestrate.mutate({ workflowType: "protein_prediction", sequence: quickInput, model: "ESMFold" }, {
        onSuccess: (d) => {
          toast.success(`Protein job queued (${d.creditsCost} credits)`);
          jobPolling.track({ table: "protein_prediction_jobs", id: d.recordId, navigateTo: "/protein-prediction", label: `PROT-${d.jobNumber ?? ""} Prediction` });
          setQuickInput("");
        },
        onError: (e) => toast.error(e.message),
      });
    } else if (quickWorkflow === "docking") {
      const [receptor, ligand] = quickInput.split(",").map(s => s.trim());
      orchestrate.mutate({ workflowType: "docking", receptor: receptor || quickInput, ligands: ligand || "Custom", engine: "AutoDock Vina" }, {
        onSuccess: (d) => {
          toast.success(`Docking job queued (${d.creditsCost} credits)`);
          jobPolling.track({ table: "docking_jobs", id: d.recordId, navigateTo: "/molecular-docking", label: `DOCK-${d.jobNumber ?? ""} Docking` });
          setQuickInput("");
        },
        onError: (e) => toast.error(e.message),
      });
    } else {
      orchestrate.mutate({ workflowType: "synbio", name: "Quick Design", sequence: quickInput, sequence_type: "DNA" }, {
        onSuccess: (d) => { toast.success(`SynBio analysis done (${d.creditsCost} credits)`); setQuickInput(""); },
        onError: (e) => toast.error(e.message),
      });
    }
  };

  const handleBuyCredits = () => { navigate("/billing"); };
  const displayName = user?.user_metadata?.full_name || "Researcher";
  const statusColor: Record<string, string> = { queued: "text-muted-foreground", running: "text-warning", completed: "text-success", failed: "text-destructive" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("dashboard.welcome", { name: displayName })}</h1>
          <p className="text-muted-foreground text-sm">{t("dashboard.subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t("dashboard.creditsBalance")} value={creditsBalance.toLocaleString()} icon={<CreditCard className="w-4 h-4 text-primary" />} detail={activeOrg?.org_name || t("common.noOrg")} action={t("dashboard.buyCredits")} onClick={handleBuyCredits} />
        <StatCard label={t("dashboard.activeJobs")} value={activeJobs} icon={<Zap className="w-4 h-4 text-warning" />} detail={t("dashboard.totalItems", { count: totalItems })} action={t("dashboard.view")} onClick={() => navigate("/protein-prediction")} />
        <StatCard label={t("dashboard.completed")} value={completedJobs} icon={<CheckCircle className="w-4 h-4 text-success" />} detail={`${synbioDesigns.length} ${t("dashboard.synbioDesigns").toLowerCase()}`} action={t("dashboard.view")} onClick={() => navigate("/projects")} />
        <StatCard label={t("dashboard.designs")} value={synbioDesigns.length} icon={<PlayCircle className="w-4 h-4 text-info" />} detail={t("dashboard.synbioDesigns")} action={t("dashboard.view")} onClick={() => navigate("/synbio-design")} />
      </div>

      <div className="glass-card p-5">
        <h2 className="text-foreground font-semibold mb-3">{t("dashboard.quickSubmit")}</h2>
        <div className="flex gap-3 items-end">
          <div className="flex gap-1">
            {([
              { key: "protein" as const, icon: Dna, label: t("dashboard.protein") },
              { key: "docking" as const, icon: Atom, label: t("dashboard.docking") },
              { key: "synbio" as const, icon: FlaskConical, label: t("dashboard.synbio") },
            ]).map(w => (
              <button
                key={w.key}
                onClick={() => { setQuickWorkflow(w.key); setQuickInput(""); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-colors ${quickWorkflow === w.key ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
              >
                <w.icon className="w-4 h-4" /> {w.label}
              </button>
            ))}
          </div>
          <input
            value={quickInput}
            onChange={e => setQuickInput(e.target.value)}
            placeholder={quickWorkflow === "protein" ? "Paste FASTA or UniProt ID..." : quickWorkflow === "docking" ? "Receptor, Ligand..." : "Paste DNA sequence..."}
            className="flex-1 bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            onKeyDown={e => e.key === "Enter" && handleQuickSubmit()}
          />
          <button
            onClick={handleQuickSubmit}
            disabled={orchestrate.isPending}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            <Play className="w-4 h-4" /> {orchestrate.isPending ? t("dashboard.running") : t("dashboard.submit")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-foreground font-semibold">{t("dashboard.recentJobs")}</h2>
            <span className="text-xs text-muted-foreground">{t("dashboard.jobs", { count: allJobs.length })}</span>
          </div>
          {allJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("dashboard.noJobs")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-left py-2 font-medium">{t("dashboard.id")}</th>
                    <th className="text-left py-2 font-medium">{t("dashboard.type")}</th>
                    <th className="text-left py-2 font-medium">{t("dashboard.name")}</th>
                    <th className="text-left py-2 font-medium">{t("dashboard.status")}</th>
                    <th className="text-left py-2 font-medium">{t("dashboard.credits")}</th>
                    <th className="text-left py-2 font-medium">{t("dashboard.date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {allJobs.slice(0, 10).map(j => (
                    <tr key={j.id} className="border-b border-border hover:bg-secondary/50">
                      <td className="py-2 text-foreground font-mono text-xs">{j.id}</td>
                      <td className="py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${j.type === t("dashboard.protein") ? "bg-primary/20 text-primary" : "bg-info/20 text-info"}`}>{j.type}</span>
                      </td>
                      <td className="py-2 text-foreground truncate max-w-[150px]">{j.name}</td>
                      <td className={`py-2 ${statusColor[j.status] || "text-foreground"}`}>
                        <span className="flex items-center gap-1">
                          {j.status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                          {j.status}{j.status === "running" ? ` (${j.progress}%)` : ""}
                        </span>
                      </td>
                      <td className="py-2 text-foreground">{j.credits}</td>
                      <td className="py-2 text-muted-foreground text-xs">{new Date(j.created).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="glass-card p-5">
          <h2 className="text-foreground font-semibold mb-3">{t("dashboard.activityFeed")}</h2>
          <div className="space-y-4">
            {activityFeed.slice(0, 6).map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <item.icon className={`w-5 h-5 mt-0.5 shrink-0 ${item.color}`} />
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card p-5">
          <h2 className="text-foreground font-semibold mb-4">{t("dashboard.workflowSummary")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-secondary rounded-md p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{proteinJobs.length}</p>
              <p className="text-xs text-muted-foreground">{t("dashboard.proteinJobs")}</p>
            </div>
            <div className="bg-secondary rounded-md p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{dockingJobs.length}</p>
              <p className="text-xs text-muted-foreground">{t("dashboard.dockingJobs")}</p>
            </div>
            <div className="bg-secondary rounded-md p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{synbioDesigns.length}</p>
              <p className="text-xs text-muted-foreground">{t("dashboard.synbioDesigns")}</p>
            </div>
            <div className="bg-secondary rounded-md p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{activeJobs}</p>
              <p className="text-xs text-muted-foreground">{t("dashboard.active")}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="text-foreground font-semibold mb-3">{t("dashboard.recentUsage")}</h2>
          {usageLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("dashboard.noUsage")}</p>
          ) : (
            <div className="space-y-3">
              {usageLogs.slice(0, 6).map((log, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{log.description || "Job"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm font-medium text-foreground shrink-0">-{log.credits_used}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <JobPollingIndicator tracking={jobPolling.tracking} />
    </div>
  );
}

function StatCard({ label, value, icon, detail, action, onClick }: { label: string; value: string | number; icon: React.ReactNode; detail: string; action: string; onClick?: () => void }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {icon}
      </div>
      <span className="text-2xl font-bold text-foreground">{value}</span>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-muted-foreground">{detail}</span>
        <button onClick={onClick} className="text-xs text-primary hover:underline">{action}</button>
      </div>
    </div>
  );
}

