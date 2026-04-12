import { Button } from "@/components/ui/button";
import type { DockingViewMode } from "@/hooks/viewer/useDockingVisualization";

interface Props {
  dockingActive: boolean;
  viewMode: DockingViewMode;
  setViewMode: (m: DockingViewMode) => void;
  showHBonds: boolean;
  setShowHBonds: (v: boolean) => void;
  showDistances: boolean;
  setShowDistances: (v: boolean) => void;
  showBindingEnergy: boolean;
  setShowBindingEnergy: (v: boolean) => void;
  bestScore: number | null;
  poses: any[];
  selectedPose: number;
  setSelectedPose: (n: number) => void;
}

const VIEW_MODES: { key: DockingViewMode; label: string }[] = [
  { key: "both", label: "Both" },
  { key: "protein", label: "Protein" },
  { key: "ligand", label: "Ligand" },
];

export default function DockingControls({
  dockingActive, viewMode, setViewMode,
  showHBonds, setShowHBonds,
  showDistances, setShowDistances,
  showBindingEnergy, setShowBindingEnergy,
  bestScore, poses, selectedPose, setSelectedPose,
}: Props) {
  if (!dockingActive) {
    return <p className="text-xs text-muted-foreground py-2">Load a docking result from completed jobs to enable docking visualization.</p>;
  }

  return (
    <div className="space-y-3">
      {/* View Mode Toggle */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">View Mode</p>
        <div className="grid grid-cols-3 gap-1">
          {VIEW_MODES.map((m) => (
            <Button
              key={m.key}
              size="sm"
              variant={viewMode === m.key ? "default" : "outline"}
              className="text-xs"
              onClick={() => setViewMode(m.key)}
            >
              {m.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Display</p>
        <ToggleRow label="Hydrogen bonds" active={showHBonds} onToggle={() => setShowHBonds(!showHBonds)} />
        <ToggleRow label="Distance lines" active={showDistances} onToggle={() => setShowDistances(!showDistances)} />
        <ToggleRow label="Binding energy" active={showBindingEnergy} onToggle={() => setShowBindingEnergy(!showBindingEnergy)} />
      </div>

      {/* Binding Energy Display */}
      {showBindingEnergy && bestScore !== null && (
        <div className="bg-secondary rounded-md p-2.5">
          <div className="text-[9px] text-muted-foreground uppercase">Binding Energy</div>
          <div className={`text-lg font-bold font-mono ${bestScore < -8 ? "text-primary" : bestScore < -6 ? "text-blue-400" : "text-muted-foreground"}`}>
            {bestScore} kcal/mol
          </div>
        </div>
      )}

      {/* Pose Selector */}
      {poses.length > 1 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Pose ({selectedPose + 1}/{poses.length})</p>
          <div className="flex flex-wrap gap-1">
            {poses.map((_, i) => (
              <Button
                key={i}
                size="sm"
                variant={selectedPose === i ? "default" : "outline"}
                className="text-[10px] h-6 w-6 p-0"
                onClick={() => setSelectedPose(i)}
              >
                {i + 1}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-xs text-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        onClick={onToggle}
        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${active ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`inline-block h-3 w-3 rounded-full bg-background transition-transform ${active ? "translate-x-[14px]" : "translate-x-[2px]"}`} />
      </button>
    </label>
  );
}
