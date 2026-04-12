import { useState } from "react";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { CAS_VARIANTS, PAM_OPTIONS, ORGANISMS, STATUS_COLORS } from "@/lib/crispr-constants";
import type { CrisprExperiment } from "@/hooks/useCrisprExperiments";

interface ExperimentListProps {
  experiments: CrisprExperiment[];
  selectedExpId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => Promise<boolean>;
  onCreate: (data: {
    name: string;
    target_gene?: string;
    organism: string;
    cas_variant: string;
    description?: string;
  }) => Promise<CrisprExperiment | null>;
  isCreating: boolean;
}

export function ExperimentList({
  experiments,
  selectedExpId,
  onSelect,
  onDelete,
  onCreate,
  isCreating,
}: ExperimentListProps) {
  const [showNewExp, setShowNewExp] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGene, setNewGene] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newOrganism, setNewOrganism] = useState("Homo sapiens");
  const [newCas, setNewCas] = useState("Cas9");

  function isCasActive(v: string): boolean {
    if (v === "Custom") return !CAS_VARIANTS.includes(newCas as any) && newCas !== "";
    return newCas === v;
  }

  async function handleCreate() {
    const result = await onCreate({
      name: newName,
      target_gene: newGene || undefined,
      organism: newOrganism,
      cas_variant: newCas,
      description: newDesc || undefined,
    });
    if (result) {
      setShowNewExp(false);
      setNewName("");
      setNewGene("");
      setNewDesc("");
      setNewOrganism("Homo sapiens");
      setNewCas("Cas9");
      onSelect(result.id);
    }
  }

  return (
    <div className="bg-card border border-border rounded-[14px] p-5 mb-4">
      <div className="flex justify-between items-center mb-3">
        <div className="text-[15px] font-bold">Experiments</div>
        <button
          onClick={() => setShowNewExp(!showNewExp)}
          className="px-5 py-2.5 border-none rounded-lg cursor-pointer font-bold text-[13px] bg-muted text-foreground transition-all duration-150"
        >
          + New
        </button>
      </div>

      {showNewExp && (
        <div className="bg-muted rounded-[10px] p-4 mb-3">
          <label className="block text-[11px] text-muted-foreground mb-1.5 mt-3 uppercase tracking-wider first:mt-0">
            Experiment Name
          </label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. BRCA1 Knockout Study"
            className="w-full bg-[hsl(210_15%_85%)] border border-border rounded-lg px-3 py-2.5 text-[hsl(220_10%_15%)] text-[13px] outline-none"
          />
          <label className="block text-[11px] text-muted-foreground mb-1.5 mt-3 uppercase tracking-wider">
            Target Gene
          </label>
          <input
            value={newGene}
            onChange={(e) => setNewGene(e.target.value)}
            placeholder="e.g. BRCA1, TP53"
            className="w-full bg-[hsl(210_15%_85%)] border border-border rounded-lg px-3 py-2.5 text-[hsl(220_10%_15%)] text-[13px] outline-none"
          />
          <label className="block text-[11px] text-muted-foreground mb-1.5 mt-3 uppercase tracking-wider">
            Description
          </label>
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Experiment objectives, hypothesis…"
            className="w-full bg-[hsl(210_15%_85%)] border border-border rounded-lg px-3 py-2.5 text-[hsl(220_10%_15%)] text-[13px] outline-none min-h-[60px] resize-y"
          />
          <label className="block text-[11px] text-muted-foreground mb-1.5 mt-3 uppercase tracking-wider">
            Organism
          </label>
          <select
            value={ORGANISMS.includes(newOrganism as any) ? newOrganism : "Custom"}
            onChange={(e) => {
              if (e.target.value === "Custom") setNewOrganism("");
              else setNewOrganism(e.target.value);
            }}
            className="w-full bg-[hsl(210_15%_85%)] border border-border rounded-lg px-3 py-2.5 text-[hsl(220_10%_15%)] text-[13px] outline-none appearance-auto"
          >
            {ORGANISMS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          {!ORGANISMS.slice(0, -1).includes(newOrganism as any) && (
            <input
              value={newOrganism}
              onChange={(e) => setNewOrganism(e.target.value)}
              placeholder="Enter organism name…"
              className="w-full bg-[hsl(210_15%_85%)] border border-border rounded-lg px-3 py-2.5 text-[hsl(220_10%_15%)] text-[13px] outline-none mt-1.5"
            />
          )}
          <label className="block text-[11px] text-muted-foreground mb-1.5 mt-3 uppercase tracking-wider">
            Cas Variant
          </label>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {[...CAS_VARIANTS, "Custom" as const].map((v) => (
              <button
                key={v}
                onClick={() => {
                  if (v === "Custom") setNewCas("");
                  else {
                    setNewCas(v);
                  }
                }}
                className={`px-5 py-2.5 border-none rounded-lg cursor-pointer font-bold text-[13px] transition-all duration-150 ${
                  v !== "Custom" ? "flex-1" : ""
                } ${
                  isCasActive(v)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          {!CAS_VARIANTS.includes(newCas as any) && (
            <input
              value={newCas}
              onChange={(e) => setNewCas(e.target.value)}
              placeholder="Enter custom Cas variant…"
              className="w-full bg-[hsl(210_15%_85%)] border border-border rounded-lg px-3 py-2.5 text-[hsl(220_10%_15%)] text-[13px] outline-none mb-3"
            />
          )}
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="px-5 py-2.5 border-none rounded-lg cursor-pointer font-bold text-[13px] bg-primary text-primary-foreground transition-all duration-150"
          >
            {isCreating ? "Creating…" : "Create Experiment"}
          </button>
        </div>
      )}

      {experiments.length === 0 ? (
        <div className="text-muted-foreground text-[13px] text-center py-5">
          No experiments yet. Create one to get started.
        </div>
      ) : (
        <div className="max-h-[200px] overflow-y-auto">
          {experiments.map((exp) => (
            <div key={exp.id} className="flex items-center gap-1.5 mb-1">
              <div
                onClick={() => onSelect(exp.id)}
                className={`flex-1 px-3.5 py-2.5 rounded-lg cursor-pointer border ${
                  selectedExpId === exp.id
                    ? "bg-accent/15 border-primary/30"
                    : "bg-transparent border-border"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-semibold">{exp.name}</span>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                    style={{
                      color: STATUS_COLORS[exp.status] || "hsl(var(--muted-foreground))",
                      background: `${STATUS_COLORS[exp.status] || "hsl(var(--muted-foreground))"}15`,
                    }}
                  >
                    {exp.status}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {exp.cas_variant} • {exp.organism}{" "}
                  {exp.target_gene ? `• ${exp.target_gene}` : ""}
                </div>
              </div>
              <DeleteConfirmDialog
                title={`Delete "${exp.name}"?`}
                description="This will permanently delete this experiment and all associated guide designs and logs. This cannot be undone."
                onConfirm={async () => { await onDelete(exp.id); }}
                trigger={
                  <button
                    onClick={(e) => e.stopPropagation()}
                    title="Delete experiment"
                    className="bg-transparent border-none cursor-pointer text-muted-foreground text-[16px] px-1.5 py-1 rounded-md hover:text-destructive transition-colors"
                  >
                    ✕
                  </button>
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
