import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell,
} from "recharts";

interface AnalysisChartsProps {
  rmsdResult: { value: number; pairs: number } | null;
  sasaResult: { total: number; perResidue: { name: string; area: number }[] } | null;
  contactMap: { matrix: number[][]; labels: string[] } | null;
}

export default function AnalysisCharts({ rmsdResult, sasaResult, contactMap }: AnalysisChartsProps) {
  // SASA bar chart data
  const sasaData = useMemo(() => {
    if (!sasaResult?.perResidue) return [];
    return sasaResult.perResidue.slice(0, 15).map((r) => ({
      name: r.name.split("-").pop() || r.name,
      area: r.area,
    }));
  }, [sasaResult]);

  // Distance histogram from contact map
  const distanceData = useMemo(() => {
    if (!contactMap?.matrix) return [];
    const bins: Record<string, number> = {};
    for (let i = 0; i < contactMap.matrix.length; i++) {
      for (let j = i + 1; j < contactMap.matrix[i].length; j++) {
        const dist = contactMap.matrix[i][j];
        const bin = Math.floor(dist / 2) * 2; // 2Å bins
        const label = `${bin}-${bin + 2}`;
        bins[label] = (bins[label] || 0) + 1;
      }
    }
    return Object.entries(bins)
      .map(([range, count]) => ({ range, count }))
      .sort((a, b) => parseInt(a.range) - parseInt(b.range))
      .slice(0, 15);
  }, [contactMap]);

  // RMSD comparison data (show relative to thresholds)
  const rmsdData = useMemo(() => {
    if (!rmsdResult) return [];
    return [
      { name: "Measured", value: rmsdResult.value, fill: rmsdResult.value < 2 ? "hsl(172 66% 50%)" : rmsdResult.value < 5 ? "hsl(45 93% 47%)" : "hsl(0 84% 60%)" },
      { name: "Good (<2Å)", value: 2, fill: "hsl(172 66% 50% / 0.3)" },
      { name: "Fair (<5Å)", value: 5, fill: "hsl(45 93% 47% / 0.3)" },
    ];
  }, [rmsdResult]);

  const hasData = rmsdResult || sasaResult || contactMap;

  if (!hasData) {
    return <p className="text-xs text-muted-foreground py-4 text-center">Run analysis to see charts</p>;
  }

  return (
    <div className="space-y-4">
      {/* RMSD Bar */}
      {rmsdResult && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">RMSD Comparison</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={rmsdData} layout="vertical" margin={{ left: 50, right: 10 }}>
              <XAxis type="number" domain={[0, "auto"]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} unit=" Å" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={60} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                formatter={(v: number) => `${v.toFixed(3)} Å`}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {rmsdData.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="text-[9px] text-muted-foreground text-center">
            {rmsdResult.pairs} Cα pairs · {rmsdResult.value.toFixed(3)} Å
          </div>
        </div>
      )}

      {/* SASA Distribution */}
      {sasaResult && sasaData.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            SASA Distribution (Top 15)
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={sasaData} margin={{ left: -10, right: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 7, fill: "hsl(var(--muted-foreground))" }} angle={-45} textAnchor="end" height={40} />
              <YAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} unit=" Å²" />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                formatter={(v: number) => `${v} Å²`}
              />
              <Bar dataKey="area" fill="hsl(172 66% 50%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="text-[9px] text-muted-foreground text-center">
            Total: {sasaResult.total.toLocaleString()} Å²
          </div>
        </div>
      )}

      {/* Distance Histogram */}
      {distanceData.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Cα Distance Histogram
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={distanceData} margin={{ left: -10, right: 5 }}>
              <XAxis dataKey="range" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} unit=" Å" />
              <YAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                formatter={(v: number) => `${v} pairs`}
              />
              <Bar dataKey="count" fill="hsl(210 60% 50%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
