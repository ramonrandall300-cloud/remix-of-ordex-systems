import { AlertTriangle } from "lucide-react";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";

interface CreditGateProps {
  balance: number;
  cost?: number;
}

export function CreditGate({ balance, cost }: CreditGateProps) {
  const navigate = useLocalizedNavigate();
  const insufficient = cost ? balance < cost : balance <= 0;

  if (!insufficient) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
      <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-destructive">
          {balance <= 0 ? "No credits remaining" : `Insufficient credits (${balance} available${cost ? `, ${cost} required` : ""})`}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">Upgrade your plan to continue using the platform.</p>
      </div>
      <button
        onClick={() => navigate("/choose-plan")}
        className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Upgrade
      </button>
    </div>
  );
}
