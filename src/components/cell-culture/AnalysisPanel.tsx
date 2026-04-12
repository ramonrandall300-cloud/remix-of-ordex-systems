import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCostPreview } from "@/components/CreditCostPreview";
import { TrendingUp, ShieldAlert, Settings2, Activity } from "lucide-react";
import { CELLCULTURE_CREDIT_COST } from "@/lib/cellculture-constants";

interface Props {
  balance: number;
  onAnalysis: (type: string) => void;
  isPending: boolean;
}

export function AnalysisPanel({ balance, onAnalysis, isPending }: Props) {
  const cost = CELLCULTURE_CREDIT_COST;

  return (
    <div className="space-y-4 mt-3">
      <CreditCostPreview balance={balance} cost={cost} label="AI Analysis Cost" estimatedTime="~10 sec" />
      <div className="grid sm:grid-cols-3 gap-3">
        <Button
          onClick={() => onAnalysis("growth_prediction")}
          disabled={isPending || balance < cost}
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
        >
          <TrendingUp className="w-5 h-5 text-primary" />
          <span className="font-medium text-xs">Predict Growth</span>
          <span className="text-[10px] text-muted-foreground">72h trajectory</span>
        </Button>
        <Button
          onClick={() => onAnalysis("contamination_risk")}
          disabled={isPending || balance < cost}
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
        >
          <ShieldAlert className="w-5 h-5 text-destructive" />
          <span className="font-medium text-xs">Check Contamination</span>
          <span className="text-[10px] text-muted-foreground">Risk assessment</span>
        </Button>
        <Button
          onClick={() => onAnalysis("condition_optimization")}
          disabled={isPending || balance < cost}
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
        >
          <Settings2 className="w-5 h-5 text-accent-foreground" />
          <span className="font-medium text-xs">Optimize Conditions</span>
          <span className="text-[10px] text-muted-foreground">Environment tuning</span>
        </Button>
      </div>
      {isPending && (
        <Card>
          <CardContent className="p-6 text-center">
            <Activity className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Running AI analysis...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
