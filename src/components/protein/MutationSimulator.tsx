import { useState, useMemo, useCallback } from "react";
import { Dna, Play, Plus, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const AMINO_ACIDS = "ACDEFGHIKLMNPQRSTVWY".split("");

interface Mutation {
  position: number;
  from: string;
  to: string;
}

interface MutationSimulatorProps {
  sequence: string;
  onSubmitMutant: (mutatedSequence: string, mutations: Mutation[]) => void;
  isSubmitting?: boolean;
}

export function MutationSimulator({ sequence, onSubmitMutant, isSubmitting }: MutationSimulatorProps) {
  const [mutations, setMutations] = useState<Mutation[]>([]);
  const [expanded, setExpanded] = useState(false);

  // Extract pure sequence
  const pureSequence = useMemo(() => {
    const lines = sequence.trim().split("\n");
    const seqLines = lines[0]?.startsWith(">") ? lines.slice(1) : lines;
    return seqLines.join("").replace(/\s/g, "").toUpperCase();
  }, [sequence]);

  const headerLine = useMemo(() => {
    const lines = sequence.trim().split("\n");
    return lines[0]?.startsWith(">") ? lines[0] : null;
  }, [sequence]);

  const addMutation = () => {
    if (pureSequence.length === 0) {
      toast.error("Enter a sequence first");
      return;
    }
    setMutations(prev => [...prev, { position: 1, from: pureSequence[0] || "A", to: "A" }]);
  };

  const updateMutation = (idx: number, field: keyof Mutation, value: string | number) => {
    setMutations(prev => prev.map((m, i) => {
      if (i !== idx) return m;
      if (field === "position") {
        const pos = Math.max(1, Math.min(pureSequence.length, Number(value)));
        return { ...m, position: pos, from: pureSequence[pos - 1] || "?" };
      }
      return { ...m, [field]: value };
    }));
  };

  const removeMutation = (idx: number) => {
    setMutations(prev => prev.filter((_, i) => i !== idx));
  };

  const mutatedSequence = useMemo(() => {
    if (mutations.length === 0) return pureSequence;
    const arr = pureSequence.split("");
    for (const m of mutations) {
      if (m.position >= 1 && m.position <= arr.length) {
        arr[m.position - 1] = m.to;
      }
    }
    return arr.join("");
  }, [pureSequence, mutations]);

  const diffCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < pureSequence.length; i++) {
      if (pureSequence[i] !== mutatedSequence[i]) count++;
    }
    return count;
  }, [pureSequence, mutatedSequence]);

  const handleSubmit = useCallback(() => {
    if (mutations.length === 0) {
      toast.error("Add at least one mutation");
      return;
    }
    // Build FASTA
    const mutLabel = mutations.map(m => `${m.from}${m.position}${m.to}`).join("_");
    const header = headerLine ? `${headerLine}_mutant_${mutLabel}` : `>Mutant_${mutLabel}`;
    // Split sequence into 60-char lines
    const lines = [header];
    for (let i = 0; i < mutatedSequence.length; i += 60) {
      lines.push(mutatedSequence.slice(i, i + 60));
    }
    onSubmitMutant(lines.join("\n"), mutations);
  }, [mutations, mutatedSequence, headerLine, onSubmitMutant]);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
      >
        <Dna className="w-4 h-4" />
        <span className="text-xs font-medium">Mutation Simulator</span>
      </button>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(false)}
        className="w-full flex items-center justify-between px-3 py-2 bg-secondary/50 hover:bg-secondary transition-colors"
      >
        <div className="flex items-center gap-2">
          <Dna className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Mutation Simulator</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{mutations.length} mutation{mutations.length !== 1 ? "s" : ""}</span>
      </button>

      <div className="p-3 space-y-3">
        {/* Mutation list */}
        {mutations.map((m, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-4 text-right">{idx + 1}.</span>
            <span className="font-mono text-foreground bg-secondary px-1.5 py-0.5 rounded">{m.from}</span>
            <input
              type="number"
              min={1}
              max={pureSequence.length}
              value={m.position}
              onChange={e => updateMutation(idx, "position", e.target.value)}
              className="w-16 bg-secondary border border-border rounded px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
            <select
              value={m.to}
              onChange={e => updateMutation(idx, "to", e.target.value)}
              className="bg-secondary border border-border rounded px-2 pr-6 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2322d3ee' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 6px center",
              }}
            >
              {AMINO_ACIDS.map(aa => (
                <option key={aa} value={aa} disabled={aa === m.from}>
                  {aa}{aa === m.from ? " (WT)" : ""}
                </option>
              ))}
            </select>
            <button onClick={() => removeMutation(idx)} className="text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}

        <div className="flex gap-2">
          <button
            onClick={addMutation}
            className="flex items-center gap-1 px-2 py-1 text-[11px] border border-dashed border-border rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Plus className="w-3 h-3" /> Add Mutation
          </button>
        </div>

        {mutations.length > 0 && (
          <>
            {/* Diff preview */}
            <div className="text-[10px] text-muted-foreground">
              {diffCount} residue{diffCount !== 1 ? "s" : ""} changed • {mutatedSequence.length} AA total
            </div>

            {/* Sequence diff view (first 100 chars) */}
            <div className="bg-secondary rounded p-2 font-mono text-[10px] leading-4 overflow-x-auto max-h-20 overflow-y-auto">
              {pureSequence.slice(0, 120).split("").map((ch, i) => {
                const mutated = mutatedSequence[i];
                const changed = ch !== mutated;
                return (
                  <span key={i} className={changed ? "text-warning font-bold bg-warning/10 rounded" : "text-muted-foreground"}>
                    {mutated}
                  </span>
                );
              })}
              {pureSequence.length > 120 && <span className="text-muted-foreground">...</span>}
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded-md text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              {isSubmitting ? "Submitting..." : "Run Mutant Prediction"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
