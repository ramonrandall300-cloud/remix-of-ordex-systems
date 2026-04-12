import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { GitCompareArrows, X } from "lucide-react";
import { useCultureLogs } from "@/hooks/useCellCultures";

interface Culture {
  id: string;
  name: string;
  cell_line: string;
  passage_number: number;
  status: string;
  medium: string;
  temperature: number;
  co2_percent: number;
}

interface Props {
  cultures: Culture[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(172 66% 70%)",
  "hsl(45 93% 58%)",
  "hsl(280 65% 60%)",
  "hsl(200 70% 55%)",
];

function ComparisonChart({ selectedCultures }: { selectedCultures: Culture[] }) {
  // Fetch logs for each selected culture
  const logsQueries = selectedCultures.map((c) => useCultureLogs(c.id));

  const chartData = useMemo(() => {
    // Normalize all logs to hours since first observation per culture
    const allPoints: { hour: number; [key: string]: number | null }[] = [];
    const hourSet = new Set<number>();

    selectedCultures.forEach((culture, idx) => {
      const logs = logsQueries[idx].data || [];
      if (!logs.length) return;
      const sorted = [...logs].sort(
        (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime(),
      );
      const t0 = new Date(sorted[0].logged_at).getTime();
      sorted.forEach((log) => {
        const hour = Math.round((new Date(log.logged_at).getTime() - t0) / 3600000);
        hourSet.add(hour);
      });
    });

    const hours = [...hourSet].sort((a, b) => a - b);
    hours.forEach((h) => {
      const point: any = { hour: h };
      selectedCultures.forEach((culture, idx) => {
        const logs = logsQueries[idx].data || [];
        const sorted = [...logs].sort(
          (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime(),
        );
        if (!sorted.length) return;
        const t0 = new Date(sorted[0].logged_at).getTime();
        const match = sorted.find(
          (l) => Math.round((new Date(l.logged_at).getTime() - t0) / 3600000) === h,
        );
        point[`confluence_${idx}`] = match?.confluence_percent ?? null;
        point[`viability_${idx}`] = match?.viability_percent ?? null;
      });
      allPoints.push(point);
    });

    return allPoints;
  }, [selectedCultures, logsQueries.map((q) => q.data)]);

  if (!chartData.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No observation data to compare yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium">Confluence Comparison (%)</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} label={{ value: "Hours", position: "insideBottom", offset: -2, fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {selectedCultures.map((c, i) => (
              <Line
                key={c.id}
                type="monotone"
                dataKey={`confluence_${i}`}
                name={c.name}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium">Viability Comparison (%)</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} label={{ value: "Hours", position: "insideBottom", offset: -2, fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {selectedCultures.map((c, i) => (
              <Line
                key={c.id}
                type="monotone"
                dataKey={`viability_${i}`}
                name={c.name}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CultureComparison({ cultures }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 6) {
        next.add(id);
      }
      return next;
    });
  };

  const selectedCultures = cultures.filter((c) => selectedIds.has(c.id));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitCompareArrows className="w-4 h-4 text-primary" />
            Compare Cultures
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Select 2–6 cultures to compare side-by-side.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {cultures.map((c) => (
              <label
                key={c.id}
                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                  selectedIds.has(c.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <Checkbox
                  checked={selectedIds.has(c.id)}
                  onCheckedChange={() => toggle(c.id)}
                  disabled={!selectedIds.has(c.id) && selectedIds.size >= 6}
                />
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.name}</div>
                  <div className="text-muted-foreground text-[10px]">{c.cell_line} · P{c.passage_number}</div>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedCultures.length >= 2 && (
        <>
          {/* Metrics comparison table */}
          <Card>
            <CardContent className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Parameter</th>
                      {selectedCultures.map((c, i) => (
                        <th key={c.id} className="text-center py-2 px-2 font-medium" style={{ color: COLORS[i % COLORS.length] }}>
                          {c.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="py-1.5 pr-3 text-muted-foreground">Cell Line</td>
                      {selectedCultures.map((c) => <td key={c.id} className="text-center py-1.5">{c.cell_line}</td>)}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-1.5 pr-3 text-muted-foreground">Passage</td>
                      {selectedCultures.map((c) => <td key={c.id} className="text-center py-1.5">P{c.passage_number}</td>)}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-1.5 pr-3 text-muted-foreground">Medium</td>
                      {selectedCultures.map((c) => <td key={c.id} className="text-center py-1.5">{c.medium}</td>)}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-1.5 pr-3 text-muted-foreground">Temperature</td>
                      {selectedCultures.map((c) => <td key={c.id} className="text-center py-1.5">{c.temperature}°C</td>)}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-1.5 pr-3 text-muted-foreground">CO₂</td>
                      {selectedCultures.map((c) => <td key={c.id} className="text-center py-1.5">{c.co2_percent}%</td>)}
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-3 text-muted-foreground">Status</td>
                      {selectedCultures.map((c) => (
                        <td key={c.id} className="text-center py-1.5">
                          <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-[10px]">{c.status}</Badge>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Growth chart comparison */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Growth Curve Overlay</CardTitle>
            </CardHeader>
            <CardContent>
              <ComparisonChart selectedCultures={selectedCultures} />
            </CardContent>
          </Card>
        </>
      )}

      {selectedCultures.length === 1 && (
        <p className="text-xs text-muted-foreground text-center py-4">Select at least one more culture to compare.</p>
      )}
    </div>
  );
}
