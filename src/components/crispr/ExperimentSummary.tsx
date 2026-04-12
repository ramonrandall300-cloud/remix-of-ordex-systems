import { STATUS_COLORS } from "@/lib/crispr-constants";
import type { CrisprExperiment, CrisprGuideDesign, CrisprEditLog } from "@/hooks/useCrisprExperiments";

interface ExperimentSummaryProps {
  experiment: CrisprExperiment;
  guides: CrisprGuideDesign[];
  logs: CrisprEditLog[];
}

export function ExperimentSummary({ experiment, guides, logs }: ExperimentSummaryProps) {
  const scored = guides.filter((g) => g.status === "scored");
  const bestEff = scored.length > 0 ? Math.max(...scored.map((g) => g.efficiency_score ?? 0)) : null;
  const bestSpec = scored.length > 0 ? Math.max(...scored.map((g) => g.specificity_score ?? 0)) : null;
  const totalOffTargets = scored.reduce((sum, g) => sum + (g.off_target_results?.length ?? 0), 0);

  const stats = [
    { label: "Versions", value: guides.length },
    { label: "Best Eff.", value: bestEff != null ? `${bestEff.toFixed(0)}%` : "—" },
    { label: "Best Spec.", value: bestSpec != null ? bestSpec.toFixed(0) : "—" },
    { label: "Log Entries", value: logs.length },
  ];

  return (
    <div className="bg-card border border-border rounded-[14px] p-5 mb-4">
      <div className="flex justify-between items-center mb-3">
        <div className="text-[15px] font-bold">Experiment Summary</div>
        <span
          className="text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase border"
          style={{
            background: `${STATUS_COLORS[experiment.status]}20`,
            color: STATUS_COLORS[experiment.status],
            borderColor: `${STATUS_COLORS[experiment.status]}40`,
          }}
        >
          {experiment.status}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {stats.map((s) => (
          <div key={s.label} className="bg-muted rounded-lg px-2 py-2.5 text-center">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">
              {s.label}
            </div>
            <div className="text-[18px] font-extrabold text-foreground">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-muted-foreground mt-2.5">
        {experiment.cas_variant} • {experiment.organism}{" "}
        {experiment.target_gene ? `• ${experiment.target_gene}` : ""} • Created{" "}
        {new Date(experiment.created_at).toLocaleDateString()}
        {totalOffTargets > 0 && ` • ${totalOffTargets} total off-target sites identified`}
      </div>
    </div>
  );
}
