import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SynBioAIPanelProps {
  sequence: string;
  assemblyType: string;
  hostOrganism: string;
  gcContent: number;
  cai: number;
  constructScore: number;
}

export default function SynBioAIPanel({ sequence, assemblyType, hostOrganism, gcContent, cai, constructScore }: SynBioAIPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [mode, setMode] = useState<"explain" | "risks" | "expression" | "optimize">("explain");

  const modes = [
    { key: "explain" as const, label: "Explain Construct", icon: "🧠" },
    { key: "risks" as const, label: "Cloning Risks", icon: "⚠️" },
    { key: "expression" as const, label: "Expression Prediction", icon: "📊" },
    { key: "optimize" as const, label: "Optimization Tips", icon: "⚡" },
  ];

  async function handleAnalyze() {
    if (!sequence || sequence.length < 10) {
      toast.error("Enter a valid sequence first");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("synbio-ai-explain", {
        body: {
          mode,
          sequence: sequence.substring(0, 2000),
          assemblyType,
          hostOrganism,
          gcContent,
          cai,
          constructScore,
          seqLength: sequence.length,
        },
      });

      if (error) throw error;
      setResult(data?.analysis || "No analysis returned.");
    } catch (err: any) {
      console.error("SynBio AI error:", err);
      if (err?.message?.includes("429") || err?.status === 429) {
        toast.error("Rate limit reached. Please wait a moment and try again.");
      } else if (err?.message?.includes("402") || err?.status === 402) {
        toast.error("AI credits depleted. Please add funds in Settings.");
      } else {
        toast.error("AI analysis failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-card p-5">
      <h3 className="text-base font-bold text-foreground mb-3">🧠 AI Construct Analysis</h3>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {modes.map(m => (
          <button
            key={m.key}
            onClick={() => { setMode(m.key); setResult(null); }}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors border ${
              mode === m.key
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-secondary text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="animate-spin">⚛</span> Analyzing...
          </>
        ) : (
          <>🔬 Run AI Analysis</>
        )}
      </button>

      {result && (
        <div className="mt-3 bg-secondary rounded-lg p-4 border border-border">
          <div className="prose prose-sm prose-invert max-w-none text-xs text-foreground leading-relaxed whitespace-pre-wrap">
            {result}
          </div>
        </div>
      )}
    </div>
  );
}
