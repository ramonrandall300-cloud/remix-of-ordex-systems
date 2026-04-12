import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { BarChart3 } from "lucide-react";

interface Guide {
  id: string;
  efficiency_score: number | null;
  specificity_score: number | null;
  pam_sequence: string;
  status: string;
}

interface Experiment {
  id: string;
  name: string;
  cas_variant: string;
  organism: string;
  status: string;
}

interface Props {
  experiments: Experiment[];
  allGuides: Guide[];
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--accent-foreground))",
  "hsl(172 66% 40%)",
  "hsl(220 70% 55%)",
];

export function CrisprAnalyticsDashboard({ experiments, allGuides }: Props) {
  const scoredGuides = useMemo(() => allGuides.filter((g) => g.status === "scored"), [allGuides]);

  // Cas variant distribution
  const casDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    experiments.forEach((e) => {
      counts[e.cas_variant] = (counts[e.cas_variant] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [experiments]);

  // Efficiency distribution histogram
  const efficiencyBuckets = useMemo(() => {
    const buckets = [
      { range: "0-20", count: 0 },
      { range: "21-40", count: 0 },
      { range: "41-60", count: 0 },
      { range: "61-80", count: 0 },
      { range: "81-100", count: 0 },
    ];
    scoredGuides.forEach((g) => {
      if (g.efficiency_score == null) return;
      const idx = Math.min(4, Math.floor(g.efficiency_score / 20));
      buckets[idx].count++;
    });
    return buckets;
  }, [scoredGuides]);

  // PAM performance
  const pamPerformance = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    scoredGuides.forEach((g) => {
      if (g.efficiency_score == null) return;
      if (!map[g.pam_sequence]) map[g.pam_sequence] = { total: 0, count: 0 };
      map[g.pam_sequence].total += g.efficiency_score;
      map[g.pam_sequence].count++;
    });
    return Object.entries(map)
      .map(([pam, { total, count }]) => ({
        pam,
        avgEfficiency: Math.round(total / count),
        guides: count,
      }))
      .sort((a, b) => b.avgEfficiency - a.avgEfficiency);
  }, [scoredGuides]);

  // Summary stats
  const stats = useMemo(() => {
    const effScores = scoredGuides.map((g) => g.efficiency_score).filter((s): s is number => s != null);
    const specScores = scoredGuides.map((g) => g.specificity_score).filter((s): s is number => s != null);
    return {
      totalExperiments: experiments.length,
      totalGuides: allGuides.length,
      scoredGuides: scoredGuides.length,
      avgEfficiency: effScores.length ? Math.round(effScores.reduce((a, b) => a + b, 0) / effScores.length) : 0,
      avgSpecificity: specScores.length ? Math.round(specScores.reduce((a, b) => a + b, 0) / specScores.length) : 0,
    };
  }, [experiments, allGuides, scoredGuides]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Experiment Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-5 gap-2 text-center">
          {[
            { label: "Experiments", value: stats.totalExperiments },
            { label: "Total Guides", value: stats.totalGuides },
            { label: "Scored", value: stats.scoredGuides },
            { label: "Avg Eff.", value: `${stats.avgEfficiency}%` },
            { label: "Avg Spec.", value: `${stats.avgSpecificity}%` },
          ].map((s) => (
            <div key={s.label} className="bg-muted rounded-lg p-2">
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
              <div className="font-bold text-sm">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Efficiency histogram */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Efficiency Distribution</p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={efficiencyBuckets}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="range" tick={{ fontSize: 9 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 9 }} className="fill-muted-foreground" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cas variant distribution */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Cas Variant Usage</p>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={casDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {casDistribution.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PAM performance */}
        {pamPerformance.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Best-performing PAMs</p>
            <div className="space-y-1">
              {pamPerformance.map((p) => (
                <div key={p.pam} className="flex items-center justify-between bg-muted rounded-lg px-3 py-1.5 text-xs">
                  <span className="font-mono font-medium">{p.pam}</span>
                  <div className="flex gap-3 text-muted-foreground">
                    <span>Avg eff: <strong className="text-foreground">{p.avgEfficiency}%</strong></span>
                    <span>{p.guides} guide{p.guides !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
