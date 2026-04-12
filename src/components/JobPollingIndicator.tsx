import { Loader2 } from "lucide-react";

interface Props {
  tracking: { id: string; label: string }[];
}

export function JobPollingIndicator({ tracking }: Props) {
  if (tracking.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-card border border-border rounded-lg shadow-lg p-3 space-y-2 max-w-xs">
      <p className="text-xs font-medium text-foreground">Processing Jobs</p>
      {tracking.map((t) => (
        <div key={t.id} className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span className="truncate">{t.label}</span>
        </div>
      ))}
    </div>
  );
}
