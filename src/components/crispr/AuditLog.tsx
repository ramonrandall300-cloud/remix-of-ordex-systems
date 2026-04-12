import { useState } from "react";
import { LOG_TYPES } from "@/lib/crispr-constants";
import type { CrisprEditLog } from "@/hooks/useCrisprExperiments";

interface AuditLogProps {
  logs: CrisprEditLog[];
  experimentId: string;
  selectedGuideId?: string;
  onAddLog: (data: {
    experimentId: string;
    guideDesignId?: string;
    logType: string;
    title: string;
    content?: string;
  }) => Promise<boolean>;
  isAdding: boolean;
}

export function AuditLog({ logs, experimentId, selectedGuideId, onAddLog, isAdding }: AuditLogProps) {
  const [logTitle, setLogTitle] = useState("");
  const [logContent, setLogContent] = useState("");
  const [logType, setLogType] = useState("note");

  async function handleAdd() {
    const success = await onAddLog({
      experimentId,
      guideDesignId: selectedGuideId,
      logType,
      title: logTitle,
      content: logContent || undefined,
    });
    if (success) {
      setLogTitle("");
      setLogContent("");
    }
  }

  return (
    <>
      <div className="bg-card border border-border rounded-[14px] p-5 mb-4">
        <div className="text-[15px] font-bold mb-3">Add Entry</div>
        <label className="block text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider">
          Type
        </label>
        <div className="flex gap-1.5 mb-2">
          {LOG_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setLogType(t)}
              className={`px-2.5 py-2 border-none rounded-lg cursor-pointer font-bold text-[11px] capitalize transition-all duration-150 ${
                logType === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <label className="block text-[11px] text-muted-foreground mb-1.5 mt-3 uppercase tracking-wider">
          Title
        </label>
        <input
          value={logTitle}
          onChange={(e) => setLogTitle(e.target.value)}
          placeholder="Entry title"
          className="w-full bg-[hsl(210_15%_85%)] border border-border rounded-lg px-3 py-2.5 text-[hsl(220_10%_15%)] text-[13px] outline-none"
        />
        <label className="block text-[11px] text-muted-foreground mb-1.5 mt-3 uppercase tracking-wider">
          Notes
        </label>
        <textarea
          value={logContent}
          onChange={(e) => setLogContent(e.target.value)}
          placeholder="Details, observations, results…"
          className="w-full bg-[hsl(210_15%_85%)] border border-border rounded-lg px-3 py-2.5 text-[hsl(220_10%_15%)] text-[13px] outline-none min-h-[80px] resize-y"
        />
        <button
          onClick={handleAdd}
          disabled={isAdding}
          className="px-5 py-2.5 border-none rounded-lg cursor-pointer font-bold text-[13px] bg-primary text-primary-foreground transition-all duration-150 mt-3"
        >
          {isAdding ? "Saving…" : "Add Entry"}
        </button>
      </div>

      <div className="bg-card border border-border rounded-[14px] p-5 mb-4">
        <div className="text-[15px] font-bold mb-3">
          Audit Trail ({logs.length} entries)
        </div>
        {logs.length === 0 ? (
          <div className="text-muted-foreground text-[13px] text-center py-5">
            No entries yet.
          </div>
        ) : (
          logs.map((log, i) => {
            const dotColor =
              log.log_type === "analysis"
                ? "bg-primary"
                : log.log_type === "transfection"
                  ? "bg-warning"
                  : "bg-muted-foreground";

            return (
              <div key={log.id} className="flex gap-2.5">
                <div className="flex flex-col items-center w-4 pt-1">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                  {i < logs.length - 1 && (
                    <div className="flex-1 w-[1.5px] bg-border mt-1" />
                  )}
                </div>
                <div className="flex-1 px-3.5 py-2.5 rounded-lg mb-2 bg-muted border border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] font-semibold">{log.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded capitalize bg-accent/10 text-primary">
                      {log.log_type}
                    </span>
                  </div>
                  {log.content && (
                    <div className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
                      {log.content}
                    </div>
                  )}
                  {log.metrics &&
                    typeof log.metrics === "object" &&
                    Object.keys(log.metrics).length > 0 && (
                      <div className="flex gap-3 mt-1.5 flex-wrap">
                        {Object.entries(log.metrics as Record<string, unknown>).map(([k, v]) => (
                          <span
                            key={k}
                            className="text-[10px] text-muted-foreground bg-background px-2 py-0.5 rounded"
                          >
                            {k}:{" "}
                            <strong className="text-foreground">{String(v)}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  <div className="text-[10px] text-muted-foreground mt-1.5">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
