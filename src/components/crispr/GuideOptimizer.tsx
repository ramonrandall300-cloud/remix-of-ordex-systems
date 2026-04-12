import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Zap, Target, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Experiment {
  id: string;
  organism: string;
  cas_variant: string;
  target_gene: string | null;
}

interface Guide {
  id: string;
  guide_sequence: string;
  pam_sequence: string;
  efficiency_score: number | null;
  specificity_score: number | null;
  status: string;
  version: number;
}

interface OptimizedCandidate {
  sequence: string;
  predicted_efficiency: number;
  predicted_specificity: number;
  rationale: string;
}

interface Props {
  experiment: Experiment;
  currentGuide?: Guide | null;
  creditBalance: number;
}

export function GuideOptimizer({ experiment, currentGuide, creditBalance }: Props) {
  const [candidates, setCandidates] = useState<OptimizedCandidate[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const qc = useQueryClient();

  const handleOptimize = async () => {
    if (!currentGuide) {
      toast.error("Select a scored guide first to optimize");
      return;
    }
    if (creditBalance < 50) {
      toast.error("Insufficient credits (50 required for optimization)");
      return;
    }

    setIsOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("crispr-analysis", {
        body: {
          mode: "optimize",
          guideDesignId: currentGuide.id,
          guideSequence: currentGuide.guide_sequence,
          pamSequence: currentGuide.pam_sequence,
          organism: experiment.organism,
          targetGene: experiment.target_gene,
          currentEfficiency: currentGuide.efficiency_score,
          currentSpecificity: currentGuide.specificity_score,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCandidates(data?.candidates || []);
      toast.success("Optimization complete — top candidates generated");
    } catch (err: any) {
      toast.error(err.message || "Optimization failed");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSelectCandidate = async (candidate: OptimizedCandidate) => {
    // Submit as a new guide version
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("crispr_guide_designs").insert({
        experiment_id: experiment.id,
        user_id: user.id,
        guide_sequence: candidate.sequence,
        pam_sequence: currentGuide?.pam_sequence || "NGG",
        version: (currentGuide?.version || 0) + 1,
        status: "draft",
      });

      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["crispr_guides"] });
      toast.success("Candidate added as new guide version — run analysis to score it");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            AI Guide Optimizer
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">50 credits</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!currentGuide ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Select a scored guide from the timeline to optimize it
          </p>
        ) : (
          <>
            <div className="text-xs bg-muted rounded-lg p-3 space-y-1">
              <div className="font-medium">Current guide v{currentGuide.version}</div>
              <div className="font-mono text-[10px] text-muted-foreground break-all">
                {currentGuide.guide_sequence}
              </div>
              <div className="flex gap-3 mt-1">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-primary" />
                  Eff: {currentGuide.efficiency_score ?? "N/A"}
                </span>
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-primary" />
                  Spec: {currentGuide.specificity_score ?? "N/A"}
                </span>
              </div>
            </div>

            <Button
              onClick={handleOptimize}
              disabled={isOptimizing || creditBalance < 50}
              className="w-full gap-2"
              size="sm"
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating variants...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Auto-optimize guide
                </>
              )}
            </Button>

            {candidates.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold">Top {candidates.length} Candidates</h4>
                {candidates.map((c, i) => (
                  <div key={i} className="bg-muted rounded-lg p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Candidate #{i + 1}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px]"
                        onClick={() => handleSelectCandidate(c)}
                      >
                        Use this guide
                      </Button>
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground break-all">
                      {c.sequence}
                    </div>
                    <div className="flex gap-4">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-primary" />
                        Predicted eff: {c.predicted_efficiency}
                      </span>
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-primary" />
                        Predicted spec: {c.predicted_specificity}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{c.rationale}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
