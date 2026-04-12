import { useState, useMemo } from "react";
import { Filter } from "lucide-react";
import type { DockingJob } from "@/hooks/useDockingJobs";

interface Interaction {
  type: string;
  residue: string;
  distance_angstrom: number;
}

interface Pose {
  rank: number;
  score: number;
  rmsd: number;
  interactions: Interaction[];
}

interface ResultsInspectorProps {
  selected: DockingJob | undefined;
  onPoseSelect?: (pose: Pose) => void;
}

type FilterMode = "none" | "top3" | "strong" | "hbond" | "hydrophobic";

const FILTER_LABELS: Record<FilterMode, string> = {
  none: "All Poses",
  top3: "Top 3 (best affinity)",
  strong: "Score < -8 kcal/mol",
  hbond: "H-bond interactions",
  hydrophobic: "Hydrophobic interactions",
};

export function ResultsInspector({ selected, onPoseSelect }: ResultsInspectorProps) {
  const [selectedPoseRank, setSelectedPoseRank] = useState(1);
  const [filterMode, setFilterMode] = useState<FilterMode>("none");
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const poses: Pose[] = useMemo(() => {
    if (!selected?.poses) return [];
    try {
      const raw = selected.poses as unknown;
      if (Array.isArray(raw)) return raw as Pose[];
      return [];
    } catch {
      return [];
    }
  }, [selected?.poses]);

  const filteredPoses = useMemo(() => {
    switch (filterMode) {
      case "top3":
        return poses.slice(0, 3);
      case "strong":
        return poses.filter(p => p.score < -8);
      case "hbond":
        return poses.filter(p => p.interactions?.some(i => i.type.startsWith("H-bond")));
      case "hydrophobic":
        return poses.filter(p => p.interactions?.some(i => i.type === "Hydrophobic"));
      default:
        return poses;
    }
  }, [poses, filterMode]);

  const activePose = filteredPoses.find(p => p.rank === selectedPoseRank) ?? filteredPoses[0];

  return (
    <div className="lg:col-span-4 glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold text-foreground">Results Inspector</h2>
          <p className="text-xs text-muted-foreground">
            {selected ? `DOCK-${selected.job_number} • ${selected.status}` : "Select a job to view results"}
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-md text-xs text-foreground hover:bg-secondary"
          >
            <Filter className="w-3 h-3" />
            {filterMode === "none" ? "Filter" : FILTER_LABELS[filterMode]}
          </button>
          {showFilterMenu && (
            <div className="absolute right-0 top-8 z-10 w-52 bg-card border border-border rounded-md shadow-lg py-1">
              {(Object.keys(FILTER_LABELS) as FilterMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => { setFilterMode(mode); setShowFilterMenu(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-secondary ${filterMode === mode ? "text-primary font-medium" : "text-foreground"}`}
                >
                  {FILTER_LABELS[mode]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!selected || poses.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3" /><circle cx="6" cy="8" r="2" /><circle cx="18" cy="8" r="2" />
              <line x1="8" y1="8" x2="10" y2="11" /><line x1="16" y1="8" x2="14" y2="11" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">
            {selected ? "Awaiting results…" : "Select a completed job to view poses"}
          </p>
        </div>
      ) : (
        <>
          <h3 className="text-sm text-muted-foreground mb-2">
            Binding Poses ({filteredPoses.length}/{poses.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
            {filteredPoses.map(pose => (
              <button
                key={pose.rank}
                onClick={() => { setSelectedPoseRank(pose.rank); onPoseSelect?.(pose); }}
                className={`w-full text-left p-3 rounded-md border transition-colors ${
                  selectedPoseRank === pose.rank ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Pose {pose.rank}</span>
                  <span className={`text-sm font-bold ${pose.score < -8 ? "text-success" : "text-primary"}`}>
                    {pose.score} kcal/mol
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  RMSD: {pose.rmsd} Å • {pose.interactions?.length ?? 0} interactions
                </p>
              </button>
            ))}
            {filteredPoses.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No poses match this filter.</p>
            )}
          </div>

          {activePose && (
            <div>
              <h3 className="text-sm text-muted-foreground mb-2">
                Pose {activePose.rank} — Interactions
              </h3>
              <div className="space-y-1">
                {activePose.interactions?.map((int, i) => (
                  <div key={i} className="flex items-center justify-between text-xs p-2 rounded bg-secondary/50">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        int.type.startsWith("H-bond") ? "bg-info" :
                        int.type === "Hydrophobic" ? "bg-warning" :
                        int.type === "π-stacking" ? "bg-primary" :
                        int.type === "Salt bridge" ? "bg-destructive" : "bg-muted-foreground"
                      }`} />
                      <span className="text-foreground font-medium">{int.type}</span>
                    </div>
                    <span className="text-muted-foreground">{int.residue}</span>
                    <span className="text-muted-foreground">{int.distance_angstrom} Å</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
