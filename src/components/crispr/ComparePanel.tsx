import { useState } from "react";
import type { CrisprGuideDesign } from "@/hooks/useCrisprExperiments";

export function ComparePanel({ guides }: { guides: CrisprGuideDesign[] }) {
  const scored = guides.filter((g) => g.status === "scored");
  const [leftIdx, setLeftIdx] = useState(0);
  const [rightIdx, setRightIdx] = useState(1);

  if (scored.length < 2)
    return (
      <div className="bg-card border border-border rounded-[14px] p-10 mb-4 text-center">
        <div className="text-[14px] text-muted-foreground">
          Need at least 2 scored guide versions to compare.
        </div>
      </div>
    );

  const left = scored[leftIdx] || scored[0];
  const right = scored[rightIdx] || scored[1];

  function delta(a: number | null, b: number | null) {
    if (a == null || b == null) return null;
    const d = b - a;
    return d > 0 ? `+${d.toFixed(1)}` : d.toFixed(1);
  }

  return (
    <div className="bg-card border border-border rounded-[14px] p-5 mb-4">
      <div className="text-[15px] font-bold mb-4">Compare Guide Versions</div>
      <div className="flex gap-2 mb-4">
        <div className="flex-1">
          <label className="block text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider">
            Version A
          </label>
          <select
            value={leftIdx}
            onChange={(e) => setLeftIdx(Number(e.target.value))}
            className="w-full bg-[hsl(210_15%_85%)] border border-border rounded-lg px-3 py-2.5 text-[hsl(220_10%_15%)] text-[13px] outline-none appearance-auto"
          >
            {scored.map((g, i) => (
              <option key={g.id} value={i}>
                v{g.version} — {g.guide_sequence.slice(0, 10)}…
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider">
            Version B
          </label>
          <select
            value={rightIdx}
            onChange={(e) => setRightIdx(Number(e.target.value))}
            className="w-full bg-[hsl(210_15%_85%)] border border-border rounded-lg px-3 py-2.5 text-[hsl(220_10%_15%)] text-[13px] outline-none appearance-auto"
          >
            {scored.map((g, i) => (
              <option key={g.id} value={i}>
                v{g.version} — {g.guide_sequence.slice(0, 10)}…
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[left, right].map((g) => (
          <div key={g.id} className="bg-muted rounded-[10px] p-3.5">
            <div className="text-[12px] font-bold mb-2 text-primary">v{g.version}</div>
            <div className="font-mono text-[10px] break-all mb-2 text-foreground leading-relaxed">
              {g.guide_sequence}
            </div>
            <div className="text-[10px] text-muted-foreground mb-1">
              PAM: {g.pam_sequence}
            </div>
            <div className="flex gap-2 mt-2">
              {[
                { label: "Efficiency", val: g.efficiency_score },
                { label: "Specificity", val: g.specificity_score },
                { label: "Off-targets", val: g.off_target_results?.length ?? 0 },
              ].map(({ label, val }) => (
                <div key={label} className="flex-1">
                  <div className="text-[9px] text-muted-foreground uppercase">{label}</div>
                  <div className="text-[16px] font-extrabold text-foreground">
                    {typeof val === "number" ? val.toFixed(1) : "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 bg-accent/10 rounded-lg p-3 text-[12px]">
        <div className="font-bold mb-1.5 text-foreground">Δ Change (A → B)</div>
        <div className="flex gap-4 text-muted-foreground">
          <span>
            Efficiency:{" "}
            <strong className="text-foreground">
              {delta(left.efficiency_score, right.efficiency_score) ?? "N/A"}
            </strong>
          </span>
          <span>
            Specificity:{" "}
            <strong className="text-foreground">
              {delta(left.specificity_score, right.specificity_score) ?? "N/A"}
            </strong>
          </span>
          <span>
            Off-targets:{" "}
            <strong className="text-foreground">
              {delta(
                left.off_target_results?.length ?? null,
                right.off_target_results?.length ?? null
              ) ?? "N/A"}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}
