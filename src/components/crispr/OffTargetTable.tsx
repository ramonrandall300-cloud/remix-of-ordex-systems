import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, CheckCircle2, Filter } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface OffTarget {
  chromosome: string;
  position: number;
  mismatches: number;
  cfd_score: number;
  region: string;
  gene: string;
}

type RiskLevel = "high" | "medium" | "low";

function classifyRisk(ot: OffTarget): RiskLevel {
  // High risk: exonic with ≤2 mismatches OR high CFD score
  if (ot.region === "exonic" && ot.mismatches <= 2) return "high";
  if (ot.cfd_score >= 0.2 && ot.mismatches <= 1) return "high";

  // Medium risk: exonic with more mismatches, or intronic with low mismatches
  if (ot.region === "exonic") return "medium";
  if (ot.mismatches <= 2 && ot.cfd_score >= 0.05) return "medium";
  if (ot.region === "intronic" && ot.mismatches <= 1) return "medium";

  return "low";
}

const RISK_CONFIG = {
  high: {
    icon: AlertTriangle,
    label: "High Risk",
    badgeVariant: "destructive" as const,
    textClass: "text-destructive",
    bgClass: "bg-destructive/10",
    borderClass: "border-destructive/30",
    description: "Exonic + low mismatch — potential functional disruption",
  },
  medium: {
    icon: AlertCircle,
    label: "Medium Risk",
    badgeVariant: "secondary" as const,
    textClass: "text-amber-500",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/30",
    description: "Moderate off-target potential",
  },
  low: {
    icon: CheckCircle2,
    label: "Low Risk",
    badgeVariant: "default" as const,
    textClass: "text-primary",
    bgClass: "bg-primary/10",
    borderClass: "border-primary/30",
    description: "Unlikely functional impact",
  },
};

type FilterMode = "all" | "high" | "medium" | "low";

export function OffTargetTable({ offTargets }: { offTargets: OffTarget[] }) {
  const [filter, setFilter] = useState<FilterMode>("all");

  const classified = useMemo(
    () =>
      (offTargets ?? []).map((ot) => ({
        ...ot,
        risk: classifyRisk(ot),
      })),
    [offTargets],
  );

  const counts = useMemo(
    () => ({
      high: classified.filter((c) => c.risk === "high").length,
      medium: classified.filter((c) => c.risk === "medium").length,
      low: classified.filter((c) => c.risk === "low").length,
    }),
    [classified],
  );

  const filtered = useMemo(
    () => (filter === "all" ? classified : classified.filter((c) => c.risk === filter)),
    [classified, filter],
  );

  if (!offTargets?.length)
    return (
      <div className="text-muted-foreground text-[13px] text-center py-5">
        No off-target sites found
      </div>
    );

  return (
    <div className="space-y-3">
      {/* Risk summary bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">Risk Summary:</span>
        {(["high", "medium", "low"] as const).map((level) => {
          const cfg = RISK_CONFIG[level];
          const Icon = cfg.icon;
          const active = filter === level;
          return (
            <Button
              key={level}
              variant={active ? "default" : "outline"}
              size="sm"
              className={`h-7 text-xs gap-1.5 ${!active ? cfg.textClass : ""}`}
              onClick={() => setFilter(filter === level ? "all" : level)}
            >
              <Icon className="w-3 h-3" />
              {counts[level]} {cfg.label}
            </Button>
          );
        })}
        {filter !== "all" && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setFilter("all")}>
            <Filter className="w-3 h-3 mr-1" /> Show all
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-muted rounded-lg overflow-hidden max-h-[350px] overflow-y-auto">
        <div className="grid grid-cols-[50px_1fr_1.2fr_50px_70px_70px_80px] px-3 py-2 border-b border-border sticky top-0 bg-muted z-10">
          {["Risk", "Chr", "Position", "MM", "CFD", "Region", "Gene"].map((h) => (
            <span key={h} className="text-muted-foreground text-[10px] uppercase font-semibold">
              {h}
            </span>
          ))}
        </div>
        {filtered.slice(0, 50).map((ot, i) => {
          const cfg = RISK_CONFIG[ot.risk];
          const Icon = cfg.icon;

          return (
            <div
              key={i}
              className={`grid grid-cols-[50px_1fr_1.2fr_50px_70px_70px_80px] px-3 py-1.5 border-b border-border items-center ${
                ot.risk === "high" ? "bg-destructive/5" : i % 2 !== 0 ? "bg-background" : ""
              }`}
            >
              <span className="flex items-center">
                <Icon className={`w-3.5 h-3.5 ${cfg.textClass}`} />
              </span>
              <span className="text-foreground text-[11px] font-mono">{ot.chromosome}</span>
              <span className="text-muted-foreground text-[11px] font-mono">
                {ot.position?.toLocaleString()}
              </span>
              <span
                className={`text-[11px] font-bold ${
                  ot.mismatches <= 1
                    ? "text-destructive"
                    : ot.mismatches <= 2
                      ? "text-amber-500"
                      : "text-muted-foreground"
                }`}
              >
                {ot.mismatches}
              </span>
              <span
                className={`text-[11px] ${
                  ot.cfd_score >= 0.2 ? "text-destructive font-semibold" : ot.cfd_score >= 0.05 ? "text-amber-500" : "text-muted-foreground"
                }`}
              >
                {ot.cfd_score.toFixed(3)}
              </span>
              <span>
                <Badge
                  variant={ot.region === "exonic" ? "destructive" : ot.region === "intronic" ? "secondary" : "outline"}
                  className="text-[9px] px-1.5 py-0"
                >
                  {ot.region}
                </Badge>
              </span>
              <span
                className={`text-[10px] truncate ${
                  ot.region === "exonic" ? "text-destructive font-medium" : "text-muted-foreground"
                }`}
                title={ot.gene}
              >
                {ot.gene}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        {(["high", "medium", "low"] as const).map((level) => {
          const cfg = RISK_CONFIG[level];
          const Icon = cfg.icon;
          return (
            <div key={level} className={`rounded-md p-2 border ${cfg.bgClass} ${cfg.borderClass}`}>
              <div className={`flex items-center gap-1 font-semibold ${cfg.textClass} mb-0.5`}>
                <Icon className="w-3 h-3" />
                {cfg.label}
              </div>
              <div className="text-muted-foreground">{cfg.description}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
