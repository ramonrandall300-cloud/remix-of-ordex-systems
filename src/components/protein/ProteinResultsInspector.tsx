import { useEffect, useRef, useState, useCallback } from "react";
import type { ProteinJob } from "@/hooks/useProteinJobs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrgContext } from "@/contexts/OrgContext";
import { useQuery } from "@tanstack/react-query";

declare global {
  interface Window { $3Dmol: any; }
}

// pLDDT colour helper (AlphaFold standard)
function plddtColor(score: number): string {
  if (score >= 90) return "#0053d6";
  if (score >= 70) return "#65cbf3";
  if (score >= 50) return "#ffdb13";
  return "#ff7d45";
}

function plddtLabel(score: number): string {
  if (score >= 90) return "Very high";
  if (score >= 70) return "Confident";
  if (score >= 50) return "Low";
  return "Very low";
}

// ─── 3D VIEWER ───────────────────────────────────────────────────────────────
function StructureViewer({ pdbData, jobId }: { pdbData: string; jobId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading-lib" | "rendering" | "ready" | "error">("loading-lib");
  const [styleMode, setStyleMode] = useState<"cartoon" | "surface" | "stick" | "sphere">("cartoon");

  useEffect(() => {
    if (window.$3Dmol) { setStatus("rendering"); return; }
    const existing = document.getElementById("3dmol-script");
    if (existing) {
      const check = setInterval(() => {
        if (window.$3Dmol) { clearInterval(check); setStatus("rendering"); }
      }, 100);
      return () => clearInterval(check);
    }
    const script = document.createElement("script");
    script.id = "3dmol-script";
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.0.4/3Dmol-min.js";
    script.async = true;
    script.onload = () => setStatus("rendering");
    script.onerror = () => setStatus("error");
    document.head.appendChild(script);
  }, []);

  const renderStructure = useCallback(() => {
    if (!containerRef.current || !window.$3Dmol || !pdbData) return;
    try {
      if (viewerRef.current) {
        try { viewerRef.current.clear(); } catch (_) {}
        viewerRef.current = null;
      }
      containerRef.current.style.width = "100%";
      containerRef.current.style.height = "240px";

      viewerRef.current = window.$3Dmol.createViewer(containerRef.current, {
        backgroundColor: "0x0a1628",
        antialias: true,
        id: `viewer-${jobId}-${Date.now()}`,
      });

      const v = viewerRef.current;
      v.addModel(pdbData, "pdb");

      if (styleMode === "cartoon") {
        v.setStyle({}, { cartoon: { color: "spectrum", thickness: 0.4, arrows: true } });
      } else if (styleMode === "surface") {
        v.setStyle({}, { cartoon: { color: "0x1a3a4a", opacity: 0.2 } });
        v.addSurface(window.$3Dmol.SurfaceType.VDW, {
          opacity: 0.65,
          colorscheme: { gradient: "roygb", prop: "b", min: 0, max: 100 },
        });
      } else if (styleMode === "stick") {
        v.setStyle({}, { stick: { colorscheme: "Jmol", radius: 0.15 }, sphere: { colorscheme: "Jmol", scale: 0.25 } });
      } else if (styleMode === "sphere") {
        v.setStyle({}, { sphere: { colorscheme: "Jmol", scale: 0.4 } });
      }

      v.zoomTo();
      v.zoom(0.85);
      v.spin("y", 0.5);
      v.render();
      setStatus("ready");
    } catch (e) {
      console.error("[StructureViewer] render error:", e);
      setStatus("error");
    }
  }, [pdbData, jobId, styleMode]);

  useEffect(() => {
    if (status === "rendering") {
      const t = setTimeout(renderStructure, 80);
      return () => clearTimeout(t);
    }
  }, [status, renderStructure]);

  useEffect(() => {
    if (status === "ready" || status === "rendering") {
      setStatus("rendering");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleMode]);

  useEffect(() => () => {
    if (viewerRef.current) {
      try { viewerRef.current.clear(); } catch (_) {}
      viewerRef.current = null;
    }
  }, []);

  const styleBtns: { key: typeof styleMode; label: string }[] = [
    { key: "cartoon", label: "Cartoon" },
    { key: "surface", label: "Surface" },
    { key: "stick", label: "Stick" },
    { key: "sphere", label: "Sphere" },
  ];

  return (
    <div className="relative rounded-lg overflow-hidden mb-3.5" style={{ background: "#0a1628" }}>
      <div ref={containerRef} style={{ width: "100%", height: 240 }} />

      {(status === "loading-lib" || status === "rendering") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5" style={{ background: "#0a1628ee" }}>
          <div className="w-7 h-7 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-[11px] text-primary/50 font-mono">
            {status === "loading-lib" ? "Loading 3Dmol…" : "Rendering structure…"}
          </span>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#0a1628ee" }}>
          <span className="text-[11px] text-destructive font-mono">Failed to render structure</span>
        </div>
      )}

      {status === "ready" && (
        <div className="absolute top-2 right-2 flex gap-1">
          {styleBtns.map(b => (
            <button key={b.key} onClick={() => setStyleMode(b.key)}
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono cursor-pointer border transition-colors ${
                styleMode === b.key
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-background/80 border-primary/10 text-muted-foreground"
              }`}>
              {b.label}
            </button>
          ))}
        </div>
      )}

      {status === "ready" && (
        <button
          onClick={() => viewerRef.current?.spin("y", 0.5)}
          className="absolute bottom-2 right-2 text-[9px] px-1.5 py-0.5 rounded font-mono cursor-pointer bg-background/80 border border-primary/10 text-muted-foreground">
          ↻ Spin
        </button>
      )}
    </div>
  );
}

// ─── RESULTS INSPECTOR ────────────────────────────────────────────────────────
interface ProteinResultsInspectorProps {
  jobs: ProteinJob[];
  selectedJobId: string | null;
  onJobSelect: (id: string) => void;
}

export function ProteinResultsInspector({ jobs, selectedJobId, onJobSelect }: ProteinResultsInspectorProps) {
  const selected = jobs.find(j => j.id === selectedJobId) ?? null;
  const [pdbData, setPdbData] = useState<string | null>(null);
  const [pdbLoading, setPdbLoading] = useState(false);
  const [sendToProjectOpen, setSendToProjectOpen] = useState(false);
  const [sendingToProject, setSendingToProject] = useState(false);
  const { user } = useAuth();
  const { orgId } = useOrgContext();

  const { data: projects } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("org_id", orgId)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: !!orgId && sendToProjectOpen,
  });

  const handleSendToProject = async (projectId: string) => {
    if (!selected || !user) return;
    setSendingToProject(true);
    try {
      let pdb = pdbData || "";
      if (!pdb && selected.result_pdb_url) {
        pdb = await fetchPdbContent(selected);
      }

      const fileName = `PROT-${selected.job_number}-${selected.name}.pdb`;
      const { error } = await supabase.from("project_files").insert({
        project_id: projectId,
        name: fileName,
        file_type: "pdb",
        size_bytes: new Blob([pdb]).size,
        user_id: user.id,
        file_path: selected.result_pdb_url,
      });
      if (error) throw error;

      toast.success(`Sent to project`);
      setSendToProjectOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to send to project");
    } finally {
      setSendingToProject(false);
    }
  };

  // Robust PDB fetcher: download() primary, split-based signed URL fallback
  const fetchPdbContent = async (job: ProteinJob): Promise<string> => {
    // Primary: use supabase.storage.download() with constructed path
    try {
      const storagePath = `${job.user_id}/${job.id}.pdb`;
      const { data, error } = await supabase.storage.from("results").download(storagePath);
      if (!error && data) return await data.text();
      console.warn("[PDB] download() failed, trying fallback:", error?.message);
    } catch (e) {
      console.warn("[PDB] download() threw, trying fallback:", e);
    }

    // Fallback: extract path from URL via split and use signed URL
    if (job.result_pdb_url) {
      const parts = job.result_pdb_url.split("results/");
      if (parts.length >= 2) {
        const storagePath = decodeURIComponent(parts[parts.length - 1]);
        const { data: signedData, error: signError } = await supabase.storage
          .from("results")
          .createSignedUrl(storagePath, 300);
        if (!signError && signedData?.signedUrl) {
          const res = await fetch(signedData.signedUrl);
          if (res.ok) return await res.text();
        }
      }
    }

    throw new Error("Could not fetch PDB file");
  };

  // Fetch PDB when selected job changes
  useEffect(() => {
    if (!selected || selected.status !== "completed" || !selected.result_pdb_url) {
      setPdbData(null);
      return;
    }
    let cancelled = false;
    setPdbLoading(true);

    (async () => {
      try {
        const text = await fetchPdbContent(selected);
        if (!cancelled) setPdbData(text);
      } catch (e) {
        console.error("[ProteinResultsInspector] PDB fetch error:", e);
        if (!cancelled) {
          setPdbData(null);
          toast.error("Failed to load structure data");
        }
      } finally {
        if (!cancelled) setPdbLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selected?.id, selected?.status, selected?.result_pdb_url]);

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdb = async () => {
    if (!selected) return;
    if (pdbData) {
      downloadFile(pdbData, `PROT-${selected.job_number}.pdb`, "chemical/x-pdb");
      toast.success("PDB file downloaded");
      return;
    }
    try {
      const data = await fetchPdbContent(selected);
      downloadFile(data, `PROT-${selected.job_number}.pdb`, "chemical/x-pdb");
      toast.success("PDB file downloaded");
    } catch { toast.error("Failed to download PDB"); }
  };

  const handleDownloadMetrics = () => {
    if (!selected) return;
    const metrics = {
      job_id: selected.id, job_number: selected.job_number, name: selected.name,
      model: selected.model, status: selected.status, plddt_score: selected.plddt_score,
      plddt_binding_domain: selected.plddt_binding_domain, result_metrics: selected.result_metrics,
      created_at: selected.created_at,
    };
    downloadFile(JSON.stringify(metrics, null, 2), `PROT-${selected.job_number}-metrics.json`, "application/json");
    toast.success("Metrics JSON downloaded");
  };

  const handleDownloadFull = async () => {
    if (!selected) return;
    let pdb = pdbData || "";
    if (!pdb && selected.result_pdb_url) {
      try { pdb = await fetchPdbContent(selected); } catch {}
    }
    downloadFile(JSON.stringify({ job: { ...selected }, pdb_content: pdb || null }, null, 2),
      `PROT-${selected.job_number}-full.json`, "application/json");
    toast.success("Full results downloaded");
  };

  const modelColor = (m: string) =>
    m === "ESMFold" ? "text-primary border-primary/30 bg-primary/10" : "text-info border-info/30 bg-info/10";

  const statusColor = (s: string) =>
    s === "completed" ? "text-success" : s === "running" ? "text-warning" : s === "failed" ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="glass-card overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="text-sm font-bold text-foreground">Results Inspector</div>
        {selected && (
          <div className="text-[10px] text-muted-foreground mt-0.5">
            PROT-{selected.job_number} · {selected.status}
          </div>
        )}
      </div>

      {/* Job queue */}
      <div className="border-b border-border">
        <div className="px-4 py-1.5 text-[9px] text-muted-foreground uppercase tracking-wider grid grid-cols-[64px_1fr_80px_80px] gap-1">
          <span>ID</span><span>Name</span><span>Model</span><span>Status</span>
        </div>
        <div className="max-h-32 overflow-y-auto">
          {jobs.map(j => (
            <div key={j.id}
              onClick={() => onJobSelect(j.id)}
              className={`grid grid-cols-[64px_1fr_80px_80px] gap-1 px-4 py-2 cursor-pointer transition-colors border-l-2 ${
                selectedJobId === j.id ? "bg-primary/5 border-primary" : "border-transparent hover:bg-secondary/50"
              }`}>
              <span className="text-[11px] text-muted-foreground">PROT-{j.job_number}</span>
              <span className="text-[11px] text-foreground truncate">{j.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border w-fit ${modelColor(j.model)}`}>{j.model}</span>
              <span className={`text-[11px] ${statusColor(j.status)}`}>
                {j.status === "completed" ? "✓ " : ""}{j.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3D Viewer */}
      <div className="px-4 pt-3.5">
        {selected && pdbData ? (
          <StructureViewer key={selected.id} pdbData={pdbData} jobId={selected.id} />
        ) : (
          <div className="h-[240px] flex items-center justify-center rounded-lg mb-3.5 bg-secondary">
            {pdbLoading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-[11px] text-muted-foreground font-mono">Loading PDB…</span>
              </div>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                {selected ? (selected.status === "completed" ? "No structure data" : "Job not yet completed") : "Select a completed job"}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Model Quality & Metrics */}
      {selected && (
        <div className="px-4 pb-4 flex-1 overflow-y-auto space-y-3">
          <div>
            <div className="text-xs font-bold text-foreground mb-2">Model Quality</div>
            {[
              ["pLDDT Score (overall)", selected.plddt_score],
              ["pLDDT (binding domain)", selected.plddt_binding_domain],
            ].map(([label, val]) => {
              const score = val as number | null;
              if (score == null) return null;
              return (
                <div key={label as string} className="flex justify-between items-center mb-2 px-2.5 py-1.5 bg-secondary rounded-md">
                  <span className="text-[10px] text-muted-foreground">{label as string}</span>
                  <span className="text-[11px] flex items-center gap-1.5">
                    <span className="font-bold" style={{ color: plddtColor(score) }}>{score.toFixed(1)}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ color: plddtColor(score), background: plddtColor(score) + "22" }}>
                      {plddtLabel(score)}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>

          {selected.result_metrics && (
            <div>
              <div className="text-xs font-bold text-foreground mb-2">Metrics</div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(selected.result_metrics as Record<string, unknown>).map(([k, v]) => (
                  <div key={k} className="bg-secondary border border-border rounded-md px-2.5 py-1 text-[10px]">
                    <span className="text-muted-foreground">{k.replace(/_/g, " ")} </span>
                    <span className="text-foreground">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download */}
          <div>
            <div className="text-xs font-bold text-foreground mb-2">Export</div>
            <div className="grid grid-cols-2 gap-1.5 mb-1.5">
              <button onClick={handleDownloadPdb} disabled={!selected.result_pdb_url}
                className="px-2 py-1.5 text-[11px] rounded-md border border-border text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-40 font-mono">
                ↓ PDB File
              </button>
              <button onClick={handleDownloadMetrics} disabled={selected.status !== "completed"}
                className="px-2 py-1.5 text-[11px] rounded-md border border-border text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-40 font-mono">
                ↓ JSON Metrics
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mb-1.5">
              <button onClick={() => {
                if (!selected) return;
                // CSV export of annotations/metrics
                const rows = [["Field", "Value"]];
                rows.push(["Job ID", `PROT-${selected.job_number}`]);
                rows.push(["Name", selected.name]);
                rows.push(["Model", selected.model]);
                rows.push(["Status", selected.status]);
                rows.push(["pLDDT Score", String(selected.plddt_score ?? "N/A")]);
                rows.push(["pLDDT Binding Domain", String(selected.plddt_binding_domain ?? "N/A")]);
                rows.push(["Sequence Length", String(selected.sequence?.replace(/>.*/g, "").replace(/\s/g, "").length ?? "N/A")]);
                rows.push(["Created", selected.created_at]);
                if (selected.result_metrics) {
                  Object.entries(selected.result_metrics as Record<string, unknown>).forEach(([k, v]) => {
                    rows.push([k, String(v)]);
                  });
                }
                const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
                downloadFile(csv, `PROT-${selected.job_number}-annotations.csv`, "text/csv");
                toast.success("CSV annotations downloaded");
              }} disabled={selected.status !== "completed"}
                className="px-2 py-1.5 text-[11px] rounded-md border border-border text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-40 font-mono">
                ↓ CSV Annotations
              </button>
              <button onClick={() => {
                // PNG screenshot of the 3D viewer
                const canvas = document.querySelector<HTMLCanvasElement>(".glass-card canvas");
                if (!canvas) { toast.error("No 3D viewer to capture"); return; }
                try {
                  const dataUrl = canvas.toDataURL("image/png");
                  const a = document.createElement("a");
                  a.href = dataUrl;
                  a.download = `PROT-${selected.job_number}-structure.png`;
                  a.click();
                  toast.success("Structure screenshot downloaded");
                } catch { toast.error("Could not capture screenshot"); }
              }} disabled={!pdbData}
                className="px-2 py-1.5 text-[11px] rounded-md border border-border text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-40 font-mono">
                ↓ PNG Screenshot
              </button>
            </div>
            <button onClick={handleDownloadFull} disabled={selected.status !== "completed"}
              className="w-full px-2 py-1.5 text-[11px] rounded-md border border-border text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-40 font-mono">
              ↓ Full Results (PDB + Metrics)
            </button>
          </div>

          {/* Share */}
          <div>
            <div className="text-xs font-bold text-foreground mb-2">Share</div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setSendToProjectOpen(true)}
                disabled={selected.status !== "completed"}
                className="px-2 py-1.5 text-[11px] rounded-md border border-border text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-40 font-mono">
                Send to Project
              </button>
              <button className="px-2 py-1.5 text-[11px] rounded-md border border-border text-muted-foreground hover:bg-secondary transition-colors font-mono">
                Copy Link
              </button>
            </div>
          </div>

          {/* Send to Project Dialog */}
          {sendToProjectOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSendToProjectOpen(false)}>
              <div className="bg-card border border-border rounded-lg p-4 w-80 max-h-80 shadow-lg" onClick={e => e.stopPropagation()}>
                <div className="text-sm font-bold text-foreground mb-3">Send to Project</div>
                {!projects?.length ? (
                  <div className="text-[11px] text-muted-foreground py-4 text-center">
                    {projects ? "No projects found. Create one first." : "Loading…"}
                  </div>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {projects.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleSendToProject(p.id)}
                        disabled={sendingToProject}
                        className="w-full text-left px-3 py-2 text-[11px] rounded-md border border-border text-foreground hover:bg-secondary transition-colors disabled:opacity-40 font-mono truncate">
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setSendToProjectOpen(false)}
                  className="mt-3 w-full px-2 py-1.5 text-[11px] rounded-md border border-border text-muted-foreground hover:bg-secondary transition-colors font-mono">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
