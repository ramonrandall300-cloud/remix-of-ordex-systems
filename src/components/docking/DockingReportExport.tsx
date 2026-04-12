import { useState } from "react";
import { FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DockingReportExportProps {
  receptor?: string;
  ligand?: string;
  engine?: string;
  bestScore?: number;
  poses?: any[];
  jobNumber?: number;
}

export function DockingReportExport({ receptor, ligand, engine, bestScore, poses, jobNumber }: DockingReportExportProps) {
  const [exporting, setExporting] = useState<"csv" | "json" | null>(null);

  const canExport = !!receptor && !!ligand && Array.isArray(poses) && poses.length > 0;

  const exportCSV = () => {
    if (!canExport) return;
    setExporting("csv");
    try {
      const headers = ["Pose", "Score (kcal/mol)", "RMSD (Å)", "Interactions"];
      const rows = poses!.map((p: any, i: number) => [
        p.rank ?? i + 1,
        p.score ?? "",
        p.rmsd ?? "",
        p.interactions?.length ?? 0,
      ]);

      let csv = `# Molecular Docking Report\n`;
      csv += `# Receptor: ${receptor}\n`;
      csv += `# Ligand: ${ligand}\n`;
      csv += `# Engine: ${engine || "N/A"}\n`;
      csv += `# Best Score: ${bestScore ?? "N/A"} kcal/mol\n`;
      csv += `# Generated: ${new Date().toISOString()}\n\n`;
      csv += headers.join(",") + "\n";
      csv += rows.map((r) => r.join(",")).join("\n");

      // Interaction details
      csv += "\n\n# Interaction Details\n";
      csv += "Pose,Type,Residue,Distance (Å)\n";
      poses!.forEach((p: any, i: number) => {
        (p.interactions ?? []).forEach((int: any) => {
          csv += `${p.rank ?? i + 1},${int.type},${int.residue},${int.distance_angstrom}\n`;
        });
      });

      downloadFile(csv, `docking_report_${jobNumber ?? "export"}.csv`, "text/csv");
      toast.success("CSV report downloaded");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(null);
    }
  };

  const exportJSON = () => {
    if (!canExport) return;
    setExporting("json");
    try {
      const report = {
        report_type: "molecular_docking",
        generated_at: new Date().toISOString(),
        receptor,
        ligand,
        engine,
        best_score: bestScore,
        total_poses: poses!.length,
        poses: poses!.map((p: any, i: number) => ({
          rank: p.rank ?? i + 1,
          score: p.score,
          rmsd: p.rmsd,
          interactions: p.interactions ?? [],
        })),
      };

      downloadFile(
        JSON.stringify(report, null, 2),
        `docking_report_${jobNumber ?? "export"}.json`,
        "application/json"
      );
      toast.success("JSON report downloaded");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        Export Report
      </h3>

      {!canExport ? (
        <p className="text-xs text-muted-foreground">
          Select a completed job with results to export a scientific report.
        </p>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            disabled={!!exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-50"
          >
            {exporting === "csv" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            CSV
          </button>
          <button
            onClick={exportJSON}
            disabled={!!exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-50"
          >
            {exporting === "json" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            JSON
          </button>
        </div>
      )}
    </div>
  );
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
