import { useState } from "react";
import type { RestrictionSite } from "@/lib/synbio-dna-tools";

interface RestrictionAnalysisProps {
  sites: RestrictionSite[];
  assemblyType: string;
}

export default function RestrictionAnalysis({ sites, assemblyType }: RestrictionAnalysisProps) {
  const [filter, setFilter] = useState<"all" | "compatible">("all");

  const filtered = filter === "compatible"
    ? sites.filter(s => s.compatible.includes(assemblyType))
    : sites;

  // Group by enzyme
  const grouped = filtered.reduce<Record<string, RestrictionSite[]>>((acc, s) => {
    if (!acc[s.enzyme]) acc[s.enzyme] = [];
    acc[s.enzyme].push(s);
    return acc;
  }, {});

  const enzymeEntries = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
  const compatible = sites.filter(s => s.compatible.includes(assemblyType));

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-bold text-foreground">Restriction Analysis</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {sites.length} site{sites.length !== 1 ? "s" : ""} found
            {compatible.length > 0 && ` · ${compatible.length} compatible with ${assemblyType}`}
          </p>
        </div>
        <div className="flex gap-1">
          {(["all", "compatible"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : "Compatible"}
            </button>
          ))}
        </div>
      </div>

      {enzymeEntries.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-xs">
          {filter === "compatible"
            ? `No restriction sites compatible with ${assemblyType}`
            : "No restriction sites found in sequence"}
        </div>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {enzymeEntries.map(([enzyme, enzSites]) => {
            const isCompat = enzSites[0].compatible.includes(assemblyType);
            return (
              <div
                key={enzyme}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary border border-border"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-mono font-bold ${isCompat ? "text-primary" : "text-foreground"}`}>
                    {enzyme}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {enzSites[0].sequence}
                  </span>
                  {isCompat && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {assemblyType}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    enzSites[0].overhang === "sticky-5" ? "bg-blue-500/10 text-blue-400" :
                    enzSites[0].overhang === "sticky-3" ? "bg-orange-500/10 text-orange-400" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {enzSites[0].overhang === "sticky-5" ? "5′ overhang" :
                     enzSites[0].overhang === "sticky-3" ? "3′ overhang" : "Blunt"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {enzSites.length}× at {enzSites.map(s => s.position).join(", ")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cut map visualization */}
      {sites.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Cut Map</div>
          <div className="relative h-6 bg-secondary rounded-full overflow-hidden border border-border">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10" />
            {sites.map((s, i) => {
              const seqLen = Math.max(...sites.map(x => x.position + x.sequence.length), 1);
              const pct = (s.position / seqLen) * 100;
              const isCompat = s.compatible.includes(assemblyType);
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-0.5"
                  style={{
                    left: `${Math.min(pct, 99)}%`,
                    backgroundColor: isCompat ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.4)",
                  }}
                  title={`${s.enzyme} at ${s.position}`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
