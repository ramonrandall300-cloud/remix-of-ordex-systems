import { useState } from "react";
import { toast } from "sonner";
import { PAM_OPTIONS, CRISPR_CREDIT_COST } from "@/lib/crispr-constants";
import { CreditCostPreview } from "@/components/CreditCostPreview";
import { CreditConfirmDialog } from "@/components/CreditConfirmDialog";
import { ScoreGauge } from "./ScoreGauge";
import { OffTargetTable } from "./OffTargetTable";
import type { CrisprExperiment, CrisprGuideDesign } from "@/hooks/useCrisprExperiments";

interface GuideDesignerProps {
  experiment: CrisprExperiment;
  guides: CrisprGuideDesign[];
  selectedGuide: CrisprGuideDesign | null;
  creditBalance: number;
  isSubmitting: boolean;
  onSubmitGuide: (data: {
    experimentId: string;
    guideSequence: string;
    pamSequence: string;
    maxMismatches: number;
    organism: string;
    currentMaxVersion: number;
  }) => Promise<boolean>;
}

export function GuideDesigner({
  experiment,
  guides,
  selectedGuide,
  creditBalance,
  isSubmitting,
  onSubmitGuide,
}: GuideDesignerProps) {
  const [guideSeq, setGuideSeq] = useState("");
  const [pamSeq, setPamSeq] = useState("NGG");
  const [maxMM, setMaxMM] = useState(3);
  const [showCreditConfirm, setShowCreditConfirm] = useState(false);

  const pamOptions = PAM_OPTIONS[experiment.cas_variant] || ["NGG"];

  async function handleSubmit() {
    if (!experiment.id) {
      toast.error("Select an experiment first");
      return;
    }
    const success = await onSubmitGuide({
      experimentId: experiment.id,
      guideSequence: guideSeq,
      pamSequence: pamSeq,
      maxMismatches: maxMM,
      organism: experiment.organism,
      currentMaxVersion: guides[0]?.version ?? 0,
    });
    if (success) setGuideSeq("");
  }

  return (
    <>
      <div className="bg-card border border-border rounded-[14px] p-5 mb-4">
        <div className="text-[15px] font-bold mb-1">Guide RNA Designer</div>
        <div className="text-[12px] text-muted-foreground mb-4">
          Design and submit guide sequences for off-target analysis
        </div>

        <label className="block text-[11px] text-muted-foreground mb-1.5 mt-3 uppercase tracking-wider">
          Guide Sequence (20-24 nt)
        </label>
        <input
          value={guideSeq}
          onChange={(e) => setGuideSeq(e.target.value.toUpperCase())}
          placeholder="e.g. ATCGATCGATCGATCGATCG"
          className="w-full bg-[hsl(210_15%_85%)] border border-border rounded-lg px-3 py-2.5 text-[hsl(220_10%_15%)] text-[13px] outline-none font-mono tracking-widest"
          maxLength={25}
        />
        <div className="text-[10px] text-muted-foreground mb-2">
          {guideSeq.length} nt • GC:{" "}
          {guideSeq.length > 0
            ? (((guideSeq.match(/[GC]/g) || []).length / guideSeq.length) * 100).toFixed(1)
            : 0}
          %
        </div>

        <label className="block text-[11px] text-muted-foreground mb-1.5 mt-3 uppercase tracking-wider">
          PAM Sequence
        </label>
        <div className="flex gap-1.5 mb-1.5">
          {pamOptions.map((p) => (
            <button
              key={p}
              onClick={() => setPamSeq(p)}
              className={`px-5 py-2.5 border-none rounded-lg cursor-pointer font-bold text-[13px] transition-all duration-150 ${
                pamSeq === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <label className="block text-[11px] text-muted-foreground mb-1.5 mt-3 uppercase tracking-wider">
          Max Mismatches
        </label>
        <div className="flex gap-0 mb-4 bg-muted rounded-lg overflow-hidden border border-border">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setMaxMM(n)}
              className={`flex-1 min-w-[44px] py-2.5 px-2 border-none cursor-pointer font-bold text-[14px] transition-all duration-150 ${
                n < 5 ? "border-r border-border" : ""
              } ${
                maxMM === n
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-foreground"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <CreditCostPreview balance={creditBalance} cost={CRISPR_CREDIT_COST} estimatedTime="~30 seconds" />

        <CreditConfirmDialog
          open={showCreditConfirm}
          onOpenChange={setShowCreditConfirm}
          cost={CRISPR_CREDIT_COST}
          balance={creditBalance}
          jobLabel="CRISPR Off-Target Analysis"
          estimatedTime="~30 seconds"
          onConfirm={handleSubmit}
        />
        <button
          onClick={() => {
            if (!experiment.id) {
              toast.error("Select an experiment first");
              return;
            }
            if (creditBalance < CRISPR_CREDIT_COST) {
              toast.error("Insufficient credits");
              return;
            }
            setShowCreditConfirm(true);
          }}
          disabled={isSubmitting}
          className="w-full py-3 border-none rounded-lg cursor-pointer font-bold text-[13px] bg-primary text-primary-foreground transition-all duration-150 disabled:opacity-50 mt-2"
        >
          {isSubmitting ? "Analyzing…" : "Submit Guide & Analyze"}
        </button>
      </div>

      {/* Results for selected guide */}
      {selectedGuide?.status === "scored" && (
        <div className="bg-card border border-border rounded-[14px] p-5 mb-4">
          <div className="text-[15px] font-bold mb-4">
            Results — v{selectedGuide.version}
          </div>
          <div className="flex gap-4 mb-4">
            <ScoreGauge label="Efficiency" value={selectedGuide.efficiency_score} />
            <ScoreGauge label="Specificity" value={selectedGuide.specificity_score} />
          </div>
          {selectedGuide.risk_assessment && (
            <div className="bg-muted rounded-lg p-3 mb-4 text-[12px] text-muted-foreground leading-relaxed">
              <div className="text-[10px] font-bold uppercase tracking-wider text-foreground mb-1">
                Risk Assessment
              </div>
              {selectedGuide.risk_assessment}
            </div>
          )}
          <div className="text-[13px] font-bold mb-2">
            Off-Target Sites ({selectedGuide.off_target_results?.length ?? 0})
          </div>
          <OffTargetTable offTargets={selectedGuide.off_target_results || []} />
        </div>
      )}

      {selectedGuide?.status === "analyzing" && (
        <div className="bg-card border border-border rounded-[14px] p-10 mb-4 text-center">
          <div className="text-[24px] mb-2">⟳</div>
          <div className="text-warning text-[14px] font-semibold">Analysis in progress…</div>
          <div className="text-muted-foreground text-[12px] mt-1">
            Scanning genome for off-target sites
          </div>
        </div>
      )}
    </>
  );
}
