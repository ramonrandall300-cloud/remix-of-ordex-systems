import { Sliders } from "lucide-react";

export interface DockingParams {
  gridSizeX: number;
  gridSizeY: number;
  gridSizeZ: number;
  exhaustiveness: number;
  energyRange: number;
  numPoses: number;
}

export const DEFAULT_PARAMS: DockingParams = {
  gridSizeX: 20,
  gridSizeY: 20,
  gridSizeZ: 20,
  exhaustiveness: 8,
  energyRange: 3,
  numPoses: 9,
};

interface DockingParameterControlsProps {
  params: DockingParams;
  onChange: (params: DockingParams) => void;
  engineId: string;
}

const EXHAUSTIVENESS_RANGE = { min: 1, max: 64 };
const GRID_RANGE = { min: 10, max: 60 };
const ENERGY_RANGE = { min: 1, max: 10 };
const POSES_RANGE = { min: 1, max: 20 };

export function DockingParameterControls({ params, onChange, engineId }: DockingParameterControlsProps) {
  const update = (key: keyof DockingParams, value: number) => {
    onChange({ ...params, [key]: value });
  };

  const defaultExhaustiveness = engineId === "autodock" ? 16 : engineId === "glide" ? 24 : 8;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Sliders className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Advanced Parameters</h3>
      </div>

      {/* Grid Size */}
      <div>
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-2">
          Search Grid Size (Å)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(["X", "Y", "Z"] as const).map((axis, i) => {
            const key = `gridSize${axis}` as keyof DockingParams;
            return (
              <div key={axis}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground">{axis}</span>
                  <span className="text-[10px] text-foreground font-medium">{params[key]}</span>
                </div>
                <input
                  type="range"
                  min={GRID_RANGE.min}
                  max={GRID_RANGE.max}
                  value={params[key]}
                  onChange={(e) => update(key, Number(e.target.value))}
                  className="w-full h-1.5 accent-primary cursor-pointer"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Exhaustiveness */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Exhaustiveness</label>
          <span className="text-xs text-foreground font-medium">{params.exhaustiveness}</span>
        </div>
        <input
          type="range"
          min={EXHAUSTIVENESS_RANGE.min}
          max={EXHAUSTIVENESS_RANGE.max}
          value={params.exhaustiveness}
          onChange={(e) => update("exhaustiveness", Number(e.target.value))}
          className="w-full h-1.5 accent-primary cursor-pointer"
        />
        <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
          <span>Fast (1)</span>
          <span>Default ({defaultExhaustiveness})</span>
          <span>Thorough (64)</span>
        </div>
      </div>

      {/* Energy Range */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Energy Range (kcal/mol)</label>
          <span className="text-xs text-foreground font-medium">{params.energyRange}</span>
        </div>
        <input
          type="range"
          min={ENERGY_RANGE.min}
          max={ENERGY_RANGE.max}
          value={params.energyRange}
          onChange={(e) => update("energyRange", Number(e.target.value))}
          className="w-full h-1.5 accent-primary cursor-pointer"
        />
        <p className="text-[9px] text-muted-foreground mt-0.5">
          Max energy difference between best and worst pose
        </p>
      </div>

      {/* Number of Poses */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Number of Poses</label>
          <span className="text-xs text-foreground font-medium">{params.numPoses}</span>
        </div>
        <input
          type="range"
          min={POSES_RANGE.min}
          max={POSES_RANGE.max}
          value={params.numPoses}
          onChange={(e) => update("numPoses", Number(e.target.value))}
          className="w-full h-1.5 accent-primary cursor-pointer"
        />
      </div>

      {/* Reset button */}
      <button
        onClick={() => onChange({ ...DEFAULT_PARAMS, exhaustiveness: defaultExhaustiveness })}
        className="text-[10px] text-primary hover:underline"
      >
        Reset to defaults
      </button>
    </div>
  );
}
