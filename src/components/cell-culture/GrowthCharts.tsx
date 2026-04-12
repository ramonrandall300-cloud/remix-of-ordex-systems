import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";

interface Log {
  id: string;
  logged_at: string;
  confluence_percent: number | null;
  viability_percent: number | null;
  cell_count: number | null;
  ph: number | null;
}

interface Props {
  logs: Log[];
}

export function GrowthCharts({ logs }: Props) {
  const data = useMemo(() => {
    if (!logs.length) return [];
    // Sort ascending by time
    const sorted = [...logs].sort(
      (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime(),
    );
    return sorted.map((log) => ({
      time: new Date(log.logged_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      confluence: log.confluence_percent,
      viability: log.viability_percent,
      cellCount: log.cell_count ? Number(log.cell_count) : null,
      ph: log.ph,
    }));
  }, [logs]);

  const hasConfluence = data.some((d) => d.confluence != null);
  const hasViability = data.some((d) => d.viability != null);
  const hasCellCount = data.some((d) => d.cellCount != null);

  if (!hasConfluence && !hasViability && !hasCellCount) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Growth Curves
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Confluence & Viability Chart */}
        {(hasConfluence || hasViability) && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">Confluence & Viability (%)</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10 }}
                  className="fill-muted-foreground"
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10 }}
                  className="fill-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {hasConfluence && (
                  <Line
                    type="monotone"
                    dataKey="confluence"
                    name="Confluence"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "hsl(var(--primary))" }}
                    connectNulls
                  />
                )}
                {hasViability && (
                  <Line
                    type="monotone"
                    dataKey="viability"
                    name="Viability"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "hsl(var(--destructive))" }}
                    connectNulls
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cell Count Chart */}
        {hasCellCount && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">Cell Count</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10 }}
                  className="fill-muted-foreground"
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  className="fill-muted-foreground"
                  tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(val: number) => [val.toLocaleString(), "Cell Count"]}
                />
                <Line
                  type="monotone"
                  dataKey="cellCount"
                  name="Cell Count"
                  stroke="hsl(var(--accent-foreground))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "hsl(var(--accent-foreground))" }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
