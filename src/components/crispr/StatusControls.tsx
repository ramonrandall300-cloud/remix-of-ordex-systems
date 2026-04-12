import { STATUS_FLOW, STATUS_COLORS } from "@/lib/crispr-constants";

interface StatusControlsProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  isPending: boolean;
}

export function StatusControls({ currentStatus, onStatusChange, isPending }: StatusControlsProps) {
  return (
    <div className="bg-card border border-border rounded-[14px] p-5 mb-4">
      <div className="text-[13px] font-bold mb-2.5">Experiment Status</div>
      <div className="flex gap-1.5">
        {STATUS_FLOW.map((s) => (
          <button
            key={s}
            onClick={() => onStatusChange(s)}
            disabled={currentStatus === s || isPending}
            className={`flex-1 py-2 px-1.5 border-none rounded-lg text-[11px] font-bold capitalize transition-all duration-150 ${
              currentStatus === s
                ? "text-white cursor-default"
                : "bg-muted text-muted-foreground cursor-pointer opacity-80"
            }`}
            style={
              currentStatus === s
                ? { background: STATUS_COLORS[s] }
                : undefined
            }
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
