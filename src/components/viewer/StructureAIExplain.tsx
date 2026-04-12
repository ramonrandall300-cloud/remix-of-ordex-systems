import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Props {
  pdbData: string | null;
  structureName: string;
  structureInfo: { atoms?: number; residues?: number; chains?: string[] } | null;
}

interface AIResult {
  function_prediction: string;
  binding_site_insights: string;
  stability_analysis: string;
  drug_likeness_hints: string;
}

export default function StructureAIExplain({ pdbData, structureName, structureInfo }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);

  const handleExplain = async () => {
    if (!pdbData) return;
    setLoading(true);
    setResult(null);
    try {
      // Extract a summary of the structure for the AI (first 200 ATOM lines + metadata)
      const atomLines = pdbData.split("\n").filter((l) => l.startsWith("ATOM") || l.startsWith("HETATM"));
      const headerLines = pdbData.split("\n").filter((l) =>
        l.startsWith("TITLE") || l.startsWith("COMPND") || l.startsWith("SOURCE") || l.startsWith("HEADER") || l.startsWith("REMARK")
      ).slice(0, 30);

      const structureSummary = [
        `Structure: ${structureName}`,
        `Atoms: ${structureInfo?.atoms ?? atomLines.length}`,
        `Residues: ${structureInfo?.residues ?? "unknown"}`,
        `Chains: ${structureInfo?.chains?.join(", ") ?? "unknown"}`,
        "",
        "PDB Header:",
        ...headerLines,
        "",
        `First 100 ATOM records (of ${atomLines.length}):`,
        ...atomLines.slice(0, 100),
      ].join("\n");

      const { data, error } = await supabase.functions.invoke("structure-explain", {
        body: { structureSummary },
      });

      if (error) throw error;
      if (data?.error) {
        if (data.error.includes("Rate limit")) toast.error("Rate limited — please try again in a moment.");
        else if (data.error.includes("Payment")) toast.error("Credits exhausted — please add funds.");
        else throw new Error(data.error);
        return;
      }
      setResult(data);
    } catch (e: any) {
      toast.error(e.message || "Failed to analyse structure");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        className="w-full"
        variant="outline"
        disabled={!pdbData || loading}
        onClick={handleExplain}
      >
        {loading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("viewer3dPage.ai.analysing")}</>
        ) : (
          <><Sparkles className="mr-2 h-4 w-4" /> {t("viewer3dPage.ai.explain")}</>
        )}
      </Button>

      {result && (
        <div className="space-y-3 text-sm">
          <Section title={t("viewer3dPage.ai.functionPrediction")} content={result.function_prediction} />
          <Section title={t("viewer3dPage.ai.bindingSiteInsights")} content={result.binding_site_insights} />
          <Section title={t("viewer3dPage.ai.stabilityAnalysis")} content={result.stability_analysis} />
          <Section title={t("viewer3dPage.ai.drugLikenessHints")} content={result.drug_likeness_hints} />
        </div>
      )}
    </div>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-md bg-secondary p-3">
      <p className="text-xs font-semibold text-primary mb-1">{title}</p>
      <div className="prose prose-sm prose-invert max-w-none text-xs text-foreground">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
