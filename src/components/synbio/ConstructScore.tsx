interface ConstructScoreProps {
  overall: number;
  breakdown: { label: string; score: number; weight: number; detail: string }[];
}

export default function ConstructScorePanel({ overall, breakdown }: ConstructScoreProps) {
  const color = overall >= 80 ? "text-primary" : overall >= 60 ? "text-warning" : "text-destructive";
  const ringColor = overall >= 80 ? "hsl(var(--primary))" : overall >= 60 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (overall / 100) * circumference;

  return (
    <div className="glass-card p-5">
      <h3 className="text-base font-bold text-foreground mb-4">Construct Score</h3>

      <div className="flex items-center gap-6">
        {/* Ring gauge */}
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
            <circle cx="40" cy="40" r="36" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="36" fill="none"
              stroke={ringColor} strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl font-extrabold ${color}`}>{overall}</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 space-y-2.5">
          {breakdown.map(b => {
            const barColor = b.score >= 80 ? "bg-primary" : b.score >= 60 ? "bg-warning" : "bg-destructive";
            return (
              <div key={b.label}>
                <div className="flex justify-between mb-0.5">
                  <span className="text-xs text-muted-foreground">{b.label}</span>
                  <span className="text-xs font-bold text-foreground">{b.score}</span>
                </div>
                <div className="h-1 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${b.score}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{b.detail}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
