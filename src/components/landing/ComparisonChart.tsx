import { useTranslation } from "react-i18next";
import { Check, X, Minus } from "lucide-react";

type CellValue = "yes" | "no" | "partial" | string;

const ComparisonChart = () => {
  const { t } = useTranslation();

  const competitors = [
    { key: "ordex", name: "ORDEX" },
    { key: "schrodinger", name: "Schrödinger" },
    { key: "moe", name: "MOE" },
    { key: "rosetta", name: "Rosetta" },
  ];

  const categories = [
    {
      label: t("comparison.categories.access"),
      rows: [
        { label: t("comparison.rows.cloudBased"), values: ["yes", "partial", "no", "no"] },
        { label: t("comparison.rows.noInstall"), values: ["yes", "no", "no", "no"] },
        { label: t("comparison.rows.freeTier"), values: ["yes", "no", "no", "yes"] },
        { label: t("comparison.rows.creditPricing"), values: ["yes", "no", "no", "no"] },
      ],
    },
    {
      label: t("comparison.categories.capabilities"),
      rows: [
        { label: t("comparison.rows.proteinPrediction"), values: ["yes", "yes", "partial", "yes"] },
        { label: t("comparison.rows.molecularDocking"), values: ["yes", "yes", "yes", "partial"] },
        { label: t("comparison.rows.synbioDesign"), values: ["yes", "no", "no", "no"] },
        { label: t("comparison.rows.crisprTracking"), values: ["yes", "no", "no", "no"] },
        { label: t("comparison.rows.cellCultureAI"), values: ["yes", "no", "no", "no"] },
        { label: t("comparison.rows.viewer3d"), values: ["yes", "yes", "yes", "partial"] },
      ],
    },
    {
      label: t("comparison.categories.viewer3dAdvanced"),
      rows: [
        { label: t("comparison.rows.structureAnnotations"), values: ["yes", "partial", "partial", "no"] },
        { label: t("comparison.rows.multiStructureAlign"), values: ["yes", "yes", "yes", "yes"] },
        { label: t("comparison.rows.dockingVisualization"), values: ["yes", "yes", "yes", "no"] },
        { label: t("comparison.rows.aiStructureExplain"), values: ["yes", "no", "no", "no"] },
        { label: t("comparison.rows.sequenceViewer"), values: ["yes", "partial", "yes", "no"] },
        { label: t("comparison.rows.analysisCharts"), values: ["yes", "partial", "partial", "no"] },
        { label: t("comparison.rows.mutationSimulator"), values: ["yes", "no", "no", "no"] },
      ],
    },
    {
      label: t("comparison.categories.advancedTools"),
      rows: [
        { label: t("comparison.rows.aiInterpretation"), values: ["yes", "partial", "no", "no"] },
        { label: t("comparison.rows.restrictionAnalysis"), values: ["yes", "no", "no", "no"] },
        { label: t("comparison.rows.codonOptimization"), values: ["yes", "no", "partial", "no"] },
        { label: t("comparison.rows.primerDesign"), values: ["yes", "no", "partial", "no"] },
        { label: t("comparison.rows.orfFinder"), values: ["yes", "no", "partial", "no"] },
        { label: t("comparison.rows.constructScoring"), values: ["yes", "no", "no", "no"] },
        { label: t("comparison.rows.plasmidDesigner"), values: ["yes", "no", "no", "no"] },
        { label: t("comparison.rows.guideDesigner"), values: ["yes", "no", "no", "no"] },
        { label: t("comparison.rows.offTargetAnalysis"), values: ["yes", "no", "no", "no"] },
        { label: t("comparison.rows.genbankExport"), values: ["yes", "no", "yes", "no"] },
        { label: t("comparison.rows.scientificReport"), values: ["yes", "partial", "partial", "no"] },
        { label: t("comparison.rows.dockingParams"), values: ["yes", "yes", "yes", "partial"] },
      ],
    },
    {
      label: t("comparison.categories.collaboration"),
      rows: [
        { label: t("comparison.rows.multiTenant"), values: ["yes", "partial", "no", "no"] },
        { label: t("comparison.rows.teamRoles"), values: ["yes", "partial", "no", "no"] },
        { label: t("comparison.rows.seatManagement"), values: ["yes", "no", "no", "no"] },
        { label: t("comparison.rows.realtimeJobs"), values: ["yes", "no", "no", "no"] },
        { label: t("comparison.rows.notifications"), values: ["yes", "no", "no", "no"] },
        { label: t("comparison.rows.auditLogs"), values: ["yes", "partial", "partial", "no"] },
      ],
    },
    {
      label: t("comparison.categories.usability"),
      rows: [
        { label: t("comparison.rows.multiLanguage"), values: ["yes", "partial", "partial", "no"] },
        { label: t("comparison.rows.batchJobs"), values: ["yes", "yes", "partial", "partial"] },
      ],
    },
  ];

  const renderCell = (value: CellValue) => {
    if (value === "yes")
      return <Check className="h-5 w-5 text-primary mx-auto" />;
    if (value === "no")
      return <X className="h-5 w-5 text-muted-foreground/40 mx-auto" />;
    return <Minus className="h-5 w-5 text-yellow-500 mx-auto" />;
  };

  return (
    <section className="py-20 px-6 border-t border-border/50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">
          {t("comparison.title")}
        </h2>
        <p className="text-center text-muted-foreground mb-12">
          {t("comparison.subtitle")}
        </p>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left py-4 px-4 font-medium text-muted-foreground w-[40%]">
                  {t("comparison.feature")}
                </th>
                {competitors.map((c) => (
                  <th
                    key={c.key}
                    className={`py-4 px-3 text-center font-semibold ${
                      c.key === "ordex" ? "text-primary bg-primary/5" : "text-foreground"
                    }`}
                  >
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <>
                  <tr key={`cat-${cat.label}`} className="border-b border-border bg-muted/30">
                    <td
                      colSpan={5}
                      className="py-2.5 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground"
                    >
                      {cat.label}
                    </td>
                  </tr>
                  {cat.rows.map((row) => (
                    <tr key={row.label} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="py-3 px-4 text-foreground">{row.label}</td>
                      {row.values.map((v, i) => (
                        <td
                          key={i}
                          className={`py-3 px-3 text-center ${
                            i === 0 ? "bg-primary/5" : ""
                          }`}
                        >
                          {renderCell(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-center gap-6 mt-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> {t("comparison.legendFull", "Full support")}</span>
          <span className="flex items-center gap-1.5"><Minus className="h-4 w-4 text-yellow-500" /> {t("comparison.legendPartial", "Partial / limited")}</span>
          <span className="flex items-center gap-1.5"><X className="h-4 w-4 text-muted-foreground/40" /> {t("comparison.legendNone", "Not available")}</span>
        </div>
      </div>
    </section>
  );
};

export default ComparisonChart;
