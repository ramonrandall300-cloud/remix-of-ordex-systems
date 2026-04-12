interface ScoreGaugeProps {
  label: string;
  value: number | null;
  max?: number;
}

export function ScoreGauge({ label, value, max = 100 }: ScoreGaugeProps) {
  const pct = value != null ? Math.min(100, (value / max) * 100) : 0;
  const colorClass =
    pct >= 70 ? "text-primary" : pct >= 40 ? "text-warning" : "text-destructive";
  const barColorClass =
    pct >= 70 ? "bg-primary" : pct >= 40 ? "bg-warning" : "bg-destructive";

  return (
    <div className="flex-1 min-w-[100px]">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
        {label}
      </div>
      <div className={`text-[22px] font-extrabold mb-1 ${colorClass}`}>
        {value != null ? value.toFixed(1) : "—"}
      </div>
      <div className="h-1 bg-muted rounded-sm overflow-hidden">
        <div
          className={`h-full rounded-sm transition-all duration-500 ${barColorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
