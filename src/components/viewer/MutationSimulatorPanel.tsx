import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, FlaskConical } from "lucide-react";

interface MutationResult {
  original: { resName: string; resNum: number; chain: string };
  mutated: string;
  deltaSASA: number;
  stabilityDelta: number;
  stabilityLabel: string;
}

interface Props {
  pdbData: string | null;
  selectedResidue: { resName: string; resNum: number; chain: string } | null;
  targetResidue: string;
  setTargetResidue: (v: string) => void;
  mutationResult: MutationResult | null;
  mutationHistory: MutationResult[];
  simulateMutation: () => void;
  aminoAcids: string[];
}

export default function MutationSimulatorPanel({
  pdbData, selectedResidue, targetResidue, setTargetResidue,
  mutationResult, mutationHistory, simulateMutation, aminoAcids,
}: Props) {
  if (!pdbData) {
    return <p className="text-xs text-muted-foreground py-2">Load a structure first</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Click a residue in the sequence viewer, then choose a mutation target.
      </p>

      {selectedResidue ? (
        <div className="flex items-center gap-2 bg-secondary rounded-md p-2">
          <span className="text-xs font-mono font-bold text-primary">
            {selectedResidue.resName}{selectedResidue.resNum}
          </span>
          <span className="text-xs text-muted-foreground">({selectedResidue.chain})</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <Select value={targetResidue} onValueChange={setTargetResidue}>
            <SelectTrigger className="w-24 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {aminoAcids.map((aa) => (
                <SelectItem key={aa} value={aa} className="text-xs">{aa}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="text-xs text-primary/60 italic">Select a residue from the sequence viewer above…</div>
      )}

      <Button
        variant="outline"
        className="w-full"
        disabled={!selectedResidue || selectedResidue.resName === targetResidue}
        onClick={simulateMutation}
      >
        <FlaskConical className="mr-2 h-4 w-4" /> Simulate Mutation
      </Button>

      {mutationResult && (
        <div className="rounded-md bg-secondary p-3 space-y-2">
          <div className="flex items-center gap-1 text-xs font-medium">
            <span className="font-mono">{mutationResult.original.resName}{mutationResult.original.resNum}</span>
            <ArrowRight className="h-3 w-3" />
            <span className="font-mono text-primary">{mutationResult.mutated}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-muted-foreground">ΔSASA</span>
              <div className={`font-mono font-bold ${mutationResult.deltaSASA > 0 ? "text-primary" : mutationResult.deltaSASA < 0 ? "text-blue-400" : "text-foreground"}`}>
                {mutationResult.deltaSASA > 0 ? "+" : ""}{mutationResult.deltaSASA} Å²
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Stability</span>
              <div className={`font-mono font-bold ${
                mutationResult.stabilityLabel === "Neutral" ? "text-primary" :
                mutationResult.stabilityLabel === "Mildly destabilizing" ? "text-yellow-400" : "text-destructive"
              }`}>
                {mutationResult.stabilityLabel}
              </div>
            </div>
          </div>
          <div className="text-[9px] text-muted-foreground">
            ΔΔG estimate: {mutationResult.stabilityDelta > 0 ? "+" : ""}{mutationResult.stabilityDelta} (heuristic)
          </div>
        </div>
      )}

      {mutationHistory.length > 1 && (
        <div>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">History</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {mutationHistory.slice(1).map((m, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] bg-secondary/50 rounded px-2 py-1">
                <span className="font-mono">{m.original.resName}{m.original.resNum} → {m.mutated}</span>
                <span className={`font-mono ${
                  m.stabilityLabel === "Neutral" ? "text-primary" :
                  m.stabilityLabel === "Mildly destabilizing" ? "text-yellow-400" : "text-destructive"
                }`}>
                  {m.stabilityLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
