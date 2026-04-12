import { useState } from "react";
import { Brain, Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface ProteinAIPanelProps {
  sequence: string;
  jobName?: string;
  plddtScore?: number | null;
  plddtBindingDomain?: number | null;
  resultMetrics?: Record<string, unknown> | null;
}

export function ProteinAIPanel({ sequence, jobName, plddtScore, plddtBindingDomain, resultMetrics }: ProteinAIPanelProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [analysisType, setAnalysisType] = useState<"full" | "function" | "mutations" | "disease">("full");

  const pureSequence = sequence
    .split("\n")
    .filter(l => !l.startsWith(">"))
    .join("")
    .replace(/\s/g, "")
    .toUpperCase();

  const handleAnalyze = async (type: typeof analysisType) => {
    if (!pureSequence || pureSequence.length < 10) {
      toast.error("Sequence too short for analysis");
      return;
    }

    setAnalysisType(type);
    setLoading(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke("protein-ai-explain", {
        body: {
          sequence: pureSequence.slice(0, 2000), // limit to avoid token overflow
          analysisType: type,
          jobName,
          plddtScore,
          plddtBindingDomain,
          resultMetrics,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data.analysis || "No analysis returned");
    } catch (e: any) {
      const msg = e?.message || "Analysis failed";
      if (msg.includes("429")) {
        toast.error("Rate limited — try again in a moment");
      } else if (msg.includes("402")) {
        toast.error("Credits exhausted — please add funds");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-secondary/50 hover:bg-secondary transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">AI Protein Analysis</span>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { key: "full" as const, label: "Full Analysis", icon: "🔬" },
              { key: "function" as const, label: "Function", icon: "⚙️" },
              { key: "mutations" as const, label: "Mutation Tips", icon: "🧬" },
              { key: "disease" as const, label: "Disease Links", icon: "🏥" },
            ].map(btn => (
              <button
                key={btn.key}
                onClick={() => handleAnalyze(btn.key)}
                disabled={loading || pureSequence.length < 10}
                className={`flex items-center gap-1.5 px-2 py-1.5 text-[11px] rounded-md border transition-colors disabled:opacity-40 ${
                  analysisType === btn.key && analysis
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <span>{btn.icon}</span>
                {btn.label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-6">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-[11px] text-muted-foreground">Analyzing protein...</span>
            </div>
          )}

          {analysis && !loading && (
            <div className="bg-secondary/50 rounded-md p-3 prose prose-sm prose-invert max-w-none text-[11px] leading-relaxed overflow-y-auto max-h-64">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
          )}

          {!analysis && !loading && (
            <p className="text-[10px] text-muted-foreground text-center py-2">
              Click an analysis type to get AI-powered insights about this protein
            </p>
          )}
        </div>
      )}
    </div>
  );
}
