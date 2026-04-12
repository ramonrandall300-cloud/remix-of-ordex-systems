import { useState } from "react";
import { Brain, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface DockingAIPanelProps {
  receptor?: string;
  ligand?: string;
  engine?: string;
  bestScore?: number;
  poses?: any[];
}

export function DockingAIPanel({ receptor, ligand, engine, bestScore, poses }: DockingAIPanelProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canAnalyze = !!receptor && !!ligand;

  const handleAnalyze = async () => {
    if (!canAnalyze) return;
    setLoading(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke("docking-ai-explain", {
        body: { receptor, ligand, engine, bestScore, poses },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data.analysis);
    } catch (err: any) {
      toast.error(err.message || "AI analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          AI Docking Analysis
        </h3>
        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
          {loading ? "Analyzing…" : "Explain Results"}
        </button>
      </div>

      {!canAnalyze && !analysis && (
        <p className="text-xs text-muted-foreground">
          Select a completed docking job to get AI-powered interpretation of binding results.
        </p>
      )}

      {analysis && (
        <div className="prose prose-sm prose-invert max-w-none text-xs leading-relaxed">
          <ReactMarkdown>{analysis}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
