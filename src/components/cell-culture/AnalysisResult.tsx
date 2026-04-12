import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ShieldAlert, Settings2, Clock, AlertTriangle, CheckCircle } from "lucide-react";

interface Props {
  analysis: any;
  compact?: boolean;
}

export function AnalysisResult({ analysis, compact }: Props) {
  const result = analysis.result;
  const type = analysis.analysis_type as string;

  const typeLabel =
    type === "growth_prediction" ? "Growth Prediction" :
    type === "contamination_risk" ? "Contamination Risk" :
    "Condition Optimization";

  const typeIcon =
    type === "growth_prediction" ? <TrendingUp className="w-4 h-4 text-primary" /> :
    type === "contamination_risk" ? <ShieldAlert className="w-4 h-4 text-destructive" /> :
    <Settings2 className="w-4 h-4" />;

  return (
    <Card>
      <CardHeader className={compact ? "pb-2 pt-3 px-4" : "pb-3"}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {typeIcon}
            <CardTitle className="text-sm">{typeLabel}</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {new Date(analysis.created_at).toLocaleString()}
            <Badge variant="secondary" className="text-[10px]">{analysis.credits_cost} cr</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className={compact ? "px-4 pb-3 text-xs" : "text-sm"}>
        {result?.summary && <p className="text-muted-foreground mb-3">{result.summary}</p>}

        {type === "growth_prediction" && result?.projected_confluence && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted rounded p-2"><span className="text-muted-foreground">Growth Phase:</span> <span className="font-medium capitalize">{result.growth_phase}</span></div>
              <div className="bg-muted rounded p-2"><span className="text-muted-foreground">Doubling Time:</span> <span className="font-medium">{result.doubling_time_hours}h</span></div>
              <div className="bg-muted rounded p-2"><span className="text-muted-foreground">Passage In:</span> <span className="font-medium">{result.recommended_passage_time_hours}h</span></div>
              <div className="bg-muted rounded p-2"><span className="text-muted-foreground">Confidence:</span> <span className="font-medium">{(result.confidence * 100).toFixed(0)}%</span></div>
            </div>
            {!compact && (
              <div className="border rounded p-3 mt-2">
                <h4 className="text-xs font-semibold mb-2">Projected Trajectory</h4>
                <div className="grid grid-cols-3 gap-1 text-xs">
                  <span className="text-muted-foreground font-medium">Hours</span>
                  <span className="text-muted-foreground font-medium">Confluence</span>
                  <span className="text-muted-foreground font-medium">Viability</span>
                  {result.projected_confluence.map((p: any, i: number) => (
                    <span key={i} className="contents">
                      <span>{p.hours}h</span>
                      <span>{p.confluence_percent}%</span>
                      <span>{p.viability_percent}%</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {type === "contamination_risk" && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={`text-2xl font-bold ${result.risk_score > 70 ? "text-destructive" : result.risk_score > 40 ? "text-accent-foreground" : "text-primary"}`}>
                {result.risk_score}/100
              </div>
              <Badge variant={result.risk_level === "critical" || result.risk_level === "high" ? "destructive" : result.risk_level === "moderate" ? "secondary" : "default"}>
                {result.risk_level}
              </Badge>
            </div>
            {result.flagged_indicators?.length > 0 && (
              <div className="space-y-1">
                {result.flagged_indicators.map((ind: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    {ind.severity === "critical" ? <AlertTriangle className="w-3 h-3 text-destructive mt-0.5 shrink-0" /> :
                     ind.severity === "warning" ? <AlertTriangle className="w-3 h-3 text-accent-foreground mt-0.5 shrink-0" /> :
                     <CheckCircle className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />}
                    <div><span className="font-medium">{ind.indicator}:</span> {ind.detail}</div>
                  </div>
                ))}
              </div>
            )}
            {!compact && result.preventive_actions?.length > 0 && (
              <div className="bg-muted rounded p-3 mt-2">
                <h4 className="text-xs font-semibold mb-1">Preventive Actions</h4>
                <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
                  {result.preventive_actions.map((a: string, i: number) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {type === "condition_optimization" && (
          <div className="space-y-2">
            {result.recommendations?.map((rec: any, i: number) => (
              <div key={i} className="border rounded p-2 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{rec.parameter}</span>
                  <Badge variant={rec.priority === "high" ? "destructive" : rec.priority === "medium" ? "secondary" : "default"} className="text-[10px]">{rec.priority}</Badge>
                </div>
                <div className="text-muted-foreground">{rec.current_value} → <span className="text-foreground font-medium">{rec.recommended_value}</span></div>
                <div className="text-muted-foreground mt-0.5">{rec.rationale}</div>
              </div>
            ))}
            {!compact && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-muted rounded p-2 text-xs"><span className="text-muted-foreground">Feeding:</span> {result.feeding_schedule}</div>
                <div className="bg-muted rounded p-2 text-xs"><span className="text-muted-foreground">Passage:</span> {result.passage_recommendation}</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
