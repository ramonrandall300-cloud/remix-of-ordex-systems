import { useEffect, useRef, useState, useCallback, useMemo } from "react";

// ─── STYLE PRESETS ────────────────────────────────────────────────────────────
const STYLE_PRESETS: Record<string, (viewer: any, hasSdf: boolean) => void> = {
  "Cartoon + Stick": (v, hasSdf) => {
    v.setStyle({ model: 0 }, { cartoon: { color: "spectrum", thickness: 0.4 } });
    if (hasSdf)
      v.setStyle(
        { model: 1 },
        { stick: { colorscheme: "Jmol", radius: 0.15 }, sphere: { colorscheme: "Jmol", scale: 0.28 } },
      );
  },
  "Surface + Stick": (v, hasSdf) => {
    v.setStyle({ model: 0 }, { cartoon: { color: "0x1a3a4a", opacity: 0.3 } });
    v.addSurface("VDW", { opacity: 0.55, colorscheme: { gradient: "rwb", min: -1, max: 1 } }, { model: 0 });
    if (hasSdf)
      v.setStyle(
        { model: 1 },
        { stick: { colorscheme: "Jmol", radius: 0.18 }, sphere: { colorscheme: "Jmol", scale: 0.32 } },
      );
  },
  Wireframe: (v, hasSdf) => {
    v.setStyle({ model: 0 }, { line: { colorscheme: "ssJmol", linewidth: 1.2 } });
    if (hasSdf)
      v.setStyle(
        { model: 1 },
        { stick: { colorscheme: "Jmol", radius: 0.12 }, sphere: { colorscheme: "Jmol", scale: 0.25 } },
      );
  },
  Sphere: (v, hasSdf) => {
    v.setStyle({ model: 0 }, { sphere: { colorscheme: "Jmol", scale: 0.35, opacity: 0.5 } });
    if (hasSdf) v.setStyle({ model: 1 }, { sphere: { colorscheme: "Jmol", scale: 0.55 } });
  },
};

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface PoseInteraction {
  type: string;
  residue: string;
  distance_angstrom: number;
  strength?: string;
}

interface PoseEntry {
  id?: number;
  rank?: number;
  score: number;
  rmsd: number;
  interactions: PoseInteraction[] | number;
}

interface PoseViewerJob {
  receptor: string;
  ligand: string;
  engine: string;
  bestScore?: number;
  poses: PoseEntry[];
}

interface PoseViewer3DProps {
  job?: PoseViewerJob | null;
  pdbData?: string;
  sdfData?: string;
}

// ─── SCRIPT LOADER (singleton — only injects once per page) ──────────────────
let scriptPromise: Promise<void> | null = null;

function load3Dmol(): Promise<void> {
  // ✅ FIX 1: Actually inject the script — original code never did this
  if ((window as any).$3Dmol) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("3dmol-script");
    if (existing) {
      // Script tag exists but $3Dmol not ready yet — poll for it
      const poll = setInterval(() => {
        if ((window as any).$3Dmol) {
          clearInterval(poll);
          resolve();
        }
      }, 100);
      return;
    }

    const script = document.createElement("script");
    script.id = "3dmol-script";
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.0.4/3Dmol-min.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null; // allow retry
      reject(new Error("3Dmol.js failed to load"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function PoseViewer3D({ job, pdbData, sdfData }: PoseViewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const mountedRef = useRef(true);

  const [selectedPose, setSelectedPose] = useState(1);
  const [stylePreset, setStylePreset] = useState("Cartoon + Stick");
  const [showHBonds, setShowHBonds] = useState(true);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const hasData = !!(pdbData || sdfData);

  // ✅ FIX 2: applyStyle is separate from full re-init — style changes don't rebuild the viewer
  const applyStyle = useCallback(
    (preset: string) => {
      const v = viewerRef.current;
      if (!v) return;
      try {
        v.removeAllSurfaces();
        STYLE_PRESETS[preset]?.(v, !!sdfData);
        v.render();
      } catch (e) {
        console.warn("PoseViewer3D: applyStyle error", e);
      }
    },
    [sdfData],
  );

  // Full viewer init — only runs when pdbData/sdfData actually change
  const initViewer = useCallback(async () => {
    if (!hasData || !containerRef.current) {
      setStatus("idle");
      return;
    }

    setStatus("loading");

    try {
      await load3Dmol(); // ✅ FIX 1: loads the script if not already present
    } catch {
      if (mountedRef.current) setStatus("error");
      return;
    }

    if (!mountedRef.current) return;

    // Double rAF ensures DOM is painted and container is sized
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (!mountedRef.current || !containerRef.current) return;

        try {
          const el = containerRef.current;

          // Check container has dimensions
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            // Container not yet visible — retry after layout
            setTimeout(() => {
              if (mountedRef.current) initViewer();
            }, 250);
            return;
          }

          // Destroy previous viewer cleanly
          if (viewerRef.current) {
            try {
              viewerRef.current.clear();
            } catch {}
            viewerRef.current = null;
          }
          el.innerHTML = "";

          const $3Dmol = (window as any).$3Dmol;
          viewerRef.current = $3Dmol.createViewer(el, {
            backgroundColor: "0x070f1a",
            antialias: true,
          });

          const v = viewerRef.current;
          if (pdbData) v.addModel(pdbData, "pdb");
          if (sdfData) v.addModel(sdfData, "sdf");

          // Apply initial style
          STYLE_PRESETS[stylePreset]?.(v, !!sdfData);

          v.zoomTo();
          v.zoom(0.85);
          v.render();

          if (mountedRef.current) setStatus("ready");
        } catch (e) {
          console.error("PoseViewer3D: init error", e);
          if (mountedRef.current) setStatus("error");
        }
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdbData, sdfData, hasData]); // ✅ FIX 2: stylePreset NOT in deps — style changes use applyStyle()

  // Re-init only when data changes
  useEffect(() => {
    initViewer();
  }, [initViewer]);

  // ✅ FIX 2: Style changes only restyle, never reinit
  useEffect(() => {
    if (status === "ready") applyStyle(stylePreset);
  }, [stylePreset, status, applyStyle]);

  // Extract H-bond interactions from the selected pose
  const hbondInteractions = useMemo(() => {
    if (!job?.poses?.length) return [];
    const pose = job.poses.find(p => (p.id ?? p.rank) === selectedPose) ?? job.poses[0];
    if (!pose || !Array.isArray(pose.interactions)) return [];
    return (pose.interactions as PoseInteraction[]).filter(i => i.type.startsWith("H-bond"));
  }, [job, selectedPose]);

  // Draw H-bond dashed lines between ligand and nearby protein atoms
  useEffect(() => {
    const v = viewerRef.current;
    if (!v || status !== "ready") return;
    try {
      v.removeAllShapes();
      if (showHBonds && sdfData && hbondInteractions.length > 0) {
        // Get ligand model atoms to find anchor points for H-bond lines
        const ligandAtoms = v.getModel(1)?.selectedAtoms({}) ?? [];
        // Get protein model atoms
        const proteinAtoms = v.getModel(0)?.selectedAtoms({}) ?? [];

        hbondInteractions.forEach((interaction, idx) => {
          // Parse residue name and number from e.g. "ASP123"
          const match = interaction.residue.match(/^([A-Z]+)(\d+)$/);
          const resName = match?.[1];
          const resNum = match ? parseInt(match[2]) : null;

          // Find a protein atom in the matching residue (prefer N, O for H-bonds)
          let proteinAtom: any = null;
          if (resName && resNum && proteinAtoms.length > 0) {
            // Try polar atoms first (O, N), then any atom in that residue
            proteinAtom = proteinAtoms.find(
              (a: any) => a.resn === resName && a.resi === resNum && (a.elem === "O" || a.elem === "N")
            ) ?? proteinAtoms.find(
              (a: any) => a.resn === resName && a.resi === resNum
            );
          }

          // Pick a ligand atom (cycle through polar atoms O, N, S; fallback to any)
          const polarLigandAtoms = ligandAtoms.filter((a: any) => ["O", "N", "S"].includes(a.elem));
          const ligandAtom = polarLigandAtoms[idx % Math.max(1, polarLigandAtoms.length)]
            ?? ligandAtoms[idx % Math.max(1, ligandAtoms.length)];

          if (proteinAtom && ligandAtom) {
            v.addCylinder({
              start: { x: ligandAtom.x, y: ligandAtom.y, z: ligandAtom.z },
              end: { x: proteinAtom.x, y: proteinAtom.y, z: proteinAtom.z },
              radius: 0.045,
              fromCap: 1,
              toCap: 1,
              color: "0x2dd4bf",
              opacity: 0.75,
              dashed: true,
            });
          } else if (ligandAtom) {
            // No matching protein atom found — draw a short indicative line
            const dist = interaction.distance_angstrom || 2.0;
            v.addCylinder({
              start: { x: ligandAtom.x, y: ligandAtom.y, z: ligandAtom.z },
              end: { x: ligandAtom.x + dist * 0.5, y: ligandAtom.y + dist * 0.3, z: ligandAtom.z + dist * 0.4 },
              radius: 0.045,
              fromCap: 1,
              toCap: 1,
              color: "0x2dd4bf",
              opacity: 0.6,
              dashed: true,
            });
          }
        });
      }
      v.render();
    } catch {}
  }, [showHBonds, status, sdfData, hbondInteractions]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (viewerRef.current) {
        try {
          viewerRef.current.clear();
        } catch {}
        viewerRef.current = null;
      }
    };
  }, []);

  const poses = job?.poses ?? [];
  const best = poses[0];

  return (
    <div className="bg-background rounded-xl overflow-hidden font-mono text-foreground">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex justify-between items-center flex-wrap gap-2">
        <div>
          <div className="text-sm font-bold">3D Pose Viewer</div>
          {job && (
            <div className="text-xs text-primary mt-0.5">
              {job.receptor} + {job.ligand} · {job.engine}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowHBonds((h) => !h)}
          className={`text-[10px] px-2.5 py-1 rounded-full font-mono cursor-pointer border transition-colors inline-flex items-center gap-1.5 ${
            showHBonds ? "bg-primary/10 border-primary text-primary" : "bg-muted border-border text-muted-foreground"
          }`}
        >
          H-bonds {showHBonds ? "ON" : "OFF"}
          {hbondInteractions.length > 0 && (
            <span className={`inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold ${
              showHBonds ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground"
            }`}>
              {hbondInteractions.length}
            </span>
          )}
        </button>
      </div>

      {/* Viewer */}
      <div className="relative" style={{ height: 360 }}>
        {/* ✅ Container always mounted so ref is stable */}
        <div ref={containerRef} style={{ width: "100%", height: "100%", background: "#070f1a" }} />

        {/* Overlays */}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 gap-2">
            <div className="text-xs text-destructive">Failed to load 3D viewer</div>
            <button onClick={() => initViewer()} className="text-xs text-primary underline cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {status === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/95">
            <div className="text-xs text-muted-foreground">
              {hasData ? "Initialising…" : "Select a completed job to view structure"}
            </div>
          </div>
        )}

        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 gap-2.5">
            <div className="w-7 h-7 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <div className="text-xs text-primary/60">Rendering structure…</div>
          </div>
        )}

        {/* Style buttons — only when ready */}
        {status === "ready" && (
          <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 z-10">
            {Object.keys(STYLE_PRESETS).map((s) => (
              <button
                key={s}
                onClick={() => setStylePreset(s)}
                className={`text-[9px] px-2 py-1 rounded-md font-mono cursor-pointer border backdrop-blur-sm transition-colors ${
                  stylePreset === s
                    ? "bg-primary/15 border-primary text-primary"
                    : "bg-background/80 border-primary/20 text-muted-foreground hover:border-primary/50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Atom key */}
        {status === "ready" && (
          <div className="absolute bottom-2.5 left-2.5 flex gap-1.5 flex-wrap z-10">
            {[
              ["C", "#aaaaaa"],
              ["N", "#4488ff"],
              ["O", "#ff4444"],
              ["S", "#ffcc00"],
              ["H-bond", "hsl(var(--primary))"],
            ].map(([label, color]) => (
              <div
                key={label}
                className="flex items-center gap-1 bg-background/80 px-1.5 py-0.5 rounded-lg border border-border/50 backdrop-blur-sm"
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-[9px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Results Inspector */}
      <div className="px-4 py-3 border-t border-border">
        <div className="text-sm font-bold mb-1">Results Inspector</div>
        {job && (
          <div className="text-[10px] text-muted-foreground mb-3">
            {job.receptor} + {job.ligand}
          </div>
        )}

        {best && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              ["BEST SCORE", `${best.score} kcal/mol`, "text-primary"],
              ["POSES", `${poses.length}`, "text-blue-400"],
              ["TOP RMSD", `${best.rmsd} Å`, "text-blue-400"],
            ].map(([label, val, color]) => (
              <div key={label as string} className="bg-muted rounded-lg p-2.5 border border-border">
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</div>
                <div className={`text-lg font-bold mt-1 ${color}`}>{val}</div>
              </div>
            ))}
          </div>
        )}

        {poses.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-4 px-3 py-2 bg-muted border-b border-border text-[9px] text-muted-foreground uppercase tracking-wider">
              <span>Pose</span>
              <span>Score (kcal/mol)</span>
              <span>RMSD</span>
              <span>Interactions</span>
            </div>
            {poses.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedPose(p.id)}
                className={`grid grid-cols-4 px-3 py-2 cursor-pointer transition-colors border-b border-border/30 ${
                  selectedPose === p.id ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/50"
                }`}
              >
                <span className="text-xs text-muted-foreground">#{p.id}</span>
                <span
                  className={`text-xs font-medium ${
                    p.score < -8 ? "text-primary" : p.score < -6 ? "text-blue-400" : "text-muted-foreground"
                  } ${p.id === 1 ? "font-bold" : ""}`}
                >
                  {p.score}
                </span>
                <span className="text-xs text-muted-foreground">{p.rmsd}</span>
                <span className="text-xs text-muted-foreground">{Array.isArray(p.interactions) ? p.interactions.length : p.interactions}</span>
              </div>
            ))}
          </div>
        )}

        {!job && <div className="text-center text-primary/20 text-xs py-5">No docking results loaded</div>}
      </div>
    </div>
  );
}
