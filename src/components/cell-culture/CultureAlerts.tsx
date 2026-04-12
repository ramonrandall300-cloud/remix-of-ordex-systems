import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, Droplets, FlaskConical, Activity } from "lucide-react";

interface Log {
  id: string;
  logged_at: string;
  confluence_percent: number | null;
  viability_percent: number | null;
  ph: number | null;
  glucose_level: number | null;
}

interface Culture {
  status: string;
  cell_line: string;
}

interface Alert {
  type: "critical" | "warning" | "info";
  icon: React.ReactNode;
  title: string;
  detail: string;
}

interface Props {
  logs: Log[];
  culture: Culture;
}

export function CultureAlerts({ logs, culture }: Props) {
  const alerts = useMemo(() => {
    const result: Alert[] = [];
    if (!logs.length) return result;

    const sorted = [...logs].sort(
      (a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime(),
    );
    const latest = sorted[0];
    const previous = sorted[1];

    // Viability drop
    if (latest.viability_percent != null && latest.viability_percent < 85) {
      result.push({
        type: latest.viability_percent < 70 ? "critical" : "warning",
        icon: <TrendingDown className="w-4 h-4" />,
        title: "Low viability",
        detail: `Viability at ${latest.viability_percent}% — ${latest.viability_percent < 70 ? "critically low, consider discarding or passaging immediately" : "monitor closely and check for contamination"}`,
      });
    }

    // Viability sudden drop
    if (previous?.viability_percent != null && latest.viability_percent != null) {
      const drop = previous.viability_percent - latest.viability_percent;
      if (drop >= 15) {
        result.push({
          type: "critical",
          icon: <AlertTriangle className="w-4 h-4" />,
          title: "Sudden viability drop",
          detail: `Viability dropped ${drop.toFixed(0)}% since last observation — possible contamination event`,
        });
      }
    }

    // Over-confluence
    if (latest.confluence_percent != null && latest.confluence_percent > 90) {
      result.push({
        type: "warning",
        icon: <FlaskConical className="w-4 h-4" />,
        title: "Over-confluence",
        detail: `Confluence at ${latest.confluence_percent}% — passage recommended to prevent contact inhibition`,
      });
    }

    // pH drift
    if (latest.ph != null) {
      if (latest.ph < 6.8 || latest.ph > 7.6) {
        result.push({
          type: latest.ph < 6.5 || latest.ph > 7.8 ? "critical" : "warning",
          icon: <Droplets className="w-4 h-4" />,
          title: "pH out of range",
          detail: `pH at ${latest.ph} — optimal range is 7.0–7.4. ${latest.ph < 6.8 ? "Acidic conditions may indicate metabolic stress" : "Alkaline drift may indicate CO₂ issues"}`,
        });
      }
    }

    // Low glucose
    if (latest.glucose_level != null && latest.glucose_level < 2) {
      result.push({
        type: "warning",
        icon: <Activity className="w-4 h-4" />,
        title: "Low glucose",
        detail: `Glucose at ${latest.glucose_level} mM — cells may be nutrient-starved, consider media change`,
      });
    }

    return result;
  }, [logs]);

  if (alerts.length === 0) return null;

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-4 h-4" />
          Smart Alerts ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert, i) => (
          <div
            key={i}
            className={`rounded-lg p-3 flex items-start gap-2.5 text-xs ${
              alert.type === "critical"
                ? "bg-destructive/10 border border-destructive/30"
                : alert.type === "warning"
                  ? "bg-amber-500/10 border border-amber-500/30"
                  : "bg-primary/10 border border-primary/30"
            }`}
          >
            <div className={`mt-0.5 shrink-0 ${
              alert.type === "critical" ? "text-destructive" :
              alert.type === "warning" ? "text-amber-500" : "text-primary"
            }`}>
              {alert.icon}
            </div>
            <div>
              <div className="font-semibold">{alert.title}</div>
              <div className="text-muted-foreground mt-0.5">{alert.detail}</div>
            </div>
            <Badge
              variant={alert.type === "critical" ? "destructive" : "secondary"}
              className="text-[9px] shrink-0 ml-auto"
            >
              {alert.type}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
