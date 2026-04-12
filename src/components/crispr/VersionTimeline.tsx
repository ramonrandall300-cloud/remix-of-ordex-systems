import type { CrisprGuideDesign } from "@/hooks/useCrisprExperiments";

interface VersionTimelineProps {
  guides: CrisprGuideDesign[];
  selectedGuideId?: string;
  onSelectGuide: (guide: CrisprGuideDesign) => void;
}

export function VersionTimeline({ guides, selectedGuideId, onSelectGuide }: VersionTimelineProps) {
  return (
    <div className="bg-card border border-border rounded-[14px] p-5 mb-4">
      <div className="text-[15px] font-bold mb-4">Version Timeline</div>
      {guides.length === 0 ? (
        <div className="text-muted-foreground text-[13px] text-center py-8">
          No guide designs yet. Submit one in the Guide Designer tab.
        </div>
      ) : (
        <div>
          {guides.map((g, i) => {
            const isSelected = selectedGuideId === g.id;
            const dotColor =
              g.status === "scored"
                ? "bg-primary"
                : g.status === "analyzing"
                  ? "bg-warning"
                  : "bg-muted-foreground";
            const badgeBg =
              g.status === "scored"
                ? "bg-primary/15 text-primary"
                : g.status === "analyzing"
                  ? "bg-warning/15 text-warning"
                  : "bg-muted text-muted-foreground";

            return (
              <div
                key={g.id}
                onClick={() => onSelectGuide(g)}
                className="flex gap-3 mb-2 cursor-pointer"
              >
                <div className="flex flex-col items-center w-5">
                  <div
                    className={`w-3 h-3 rounded-full ${dotColor} ${
                      isSelected ? "ring-2 ring-foreground" : ""
                    }`}
                  />
                  {i < guides.length - 1 && (
                    <div className="flex-1 w-0.5 bg-border" />
                  )}
                </div>
                <div
                  className={`flex-1 px-3.5 py-2.5 rounded-lg mb-1 border ${
                    isSelected
                      ? "bg-accent/15 border-primary/30"
                      : "bg-muted border-border"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-bold">v{g.version}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badgeBg}`}>
                      {g.status}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-foreground mt-1 break-all">
                    {g.guide_sequence}
                  </div>
                  <div className="flex gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    <span>PAM: {g.pam_sequence}</span>
                    {g.efficiency_score != null && (
                      <span>Eff: {g.efficiency_score.toFixed(0)}%</span>
                    )}
                    {g.specificity_score != null && (
                      <span>Spec: {g.specificity_score.toFixed(0)}</span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {new Date(g.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
