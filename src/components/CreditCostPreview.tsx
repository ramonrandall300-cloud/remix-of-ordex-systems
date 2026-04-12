import { useAuth } from "@/hooks/useAuth";

interface CreditCostPreviewProps {
  balance: number;
  cost: number;
  estimatedTime?: string;
  label?: string;
}

export function CreditCostPreview({ balance, cost, estimatedTime, label = "Job Cost" }: CreditCostPreviewProps) {
  const { user } = useAuth();
  // Default is manual approval — auto-approve only if explicitly enabled
  const autoApprove = user?.user_metadata?.auto_approve_credits === true;

  if (autoApprove) return null;

  const remaining = balance - cost;
  const canAfford = balance >= cost;

  return (
    <div style={{
      background: "hsl(var(--muted))",
      border: `1px solid ${canAfford ? "hsl(var(--border))" : "hsl(var(--destructive) / 0.3)"}`,
      borderRadius: 10,
      padding: "14px 16px",
      marginBottom: 12,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>
        {label}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>Your Balance</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: balance < 50 ? "hsl(var(--destructive))" : "hsl(var(--foreground))" }}>{balance} credits</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>Estimated Cost</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "hsl(var(--primary))" }}>−{cost} credits</span>
      </div>

      <div style={{ height: 1, background: "hsl(var(--border))", margin: "8px 0" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>After Submission</span>
        <span style={{
          fontSize: 13, fontWeight: 700,
          color: canAfford ? "hsl(var(--foreground))" : "hsl(var(--destructive))",
        }}>
          {canAfford ? `${remaining} credits` : "Insufficient credits"}
        </span>
      </div>

      {estimatedTime && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>Est. Run Time</span>
          <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>{estimatedTime}</span>
        </div>
      )}
    </div>
  );
}
