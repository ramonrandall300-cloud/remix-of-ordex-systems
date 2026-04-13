import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useSynBioDesigns, useCreateSynBioDesign } from "@/hooks/useSynBioDesigns";
import PlasmidDesigner from "@/components/synbio/PlasmidDesigner";
import HostOrganismInput from "@/components/synbio/HostOrganismInput";
import SequenceToolbar from "@/components/synbio/SequenceToolbar";
import RestrictionAnalysis from "@/components/synbio/RestrictionAnalysis";
import ConstructScorePanel from "@/components/synbio/ConstructScore";
import SynBioAIPanel from "@/components/synbio/SynBioAIPanel";
import { runFullValidation, type ValidationResult } from "@/lib/synbio-validation";
import { calculateCAI, findRareCodons, optimizeSequence } from "@/lib/synbio-codon-tables";
import { analyzeRestrictionSites } from "@/lib/synbio-dna-tools";
import { calculateConstructScore } from "@/lib/synbio-dna-tools";
import { exportFASTA, exportGenBank, exportJSON, downloadFile } from "@/lib/synbio-export";
import { findAllORFs } from "@/lib/synbio-dna-tools";
import { CreditCostPreview } from "@/components/CreditCostPreview";
import { CreditGate } from "@/components/CreditGate";
import { CreditConfirmDialog } from "@/components/CreditConfirmDialog";
import { useCredits } from "@/hooks/useCredits";
import { useOrgContext } from "@/contexts/OrgContext";
import { toast } from "sonner";

const SAMPLE_SEQUENCE = "ATGGCTAGCATGACTGGTGGACAGCAAATGGGTCGGGATCTGTACGACGATGACGATAAGGGCAGCGTGCAGCTCGCCGACCACTACCAGCAGAACACCCCAATCGGCGACGGCCCCGTGCTGCTGCCCGACAACCACTACCTGAGCTACCAAGCCAAGCTGAGCAAAGACCCCAACGAGAAGCGGGACCACATGGTGCTGCTGGAGTTCGTAACGGCCGCCGGCATCACTCACGGCATGGACGAGCTGTACAAGTGA";

function calcGC(seq: string) {
  const s = seq.toUpperCase().replace(/[^ATGCU]/g, "");
  if (!s.length) return 0;
  return ((s.match(/[GC]/g) || []).length / s.length) * 100;
}

function calcBP(seq: string) {
  return seq.replace(/[^ATGCUatgcu]/g, "").length;
}

function GCBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const colorClass = pct > 75 ? "text-destructive" : pct > 65 ? "text-warning" : "text-primary";
  const barColor = pct > 75 ? "bg-destructive" : pct > 65 ? "bg-warning" : "bg-primary";
  return (
    <div className="mt-2">
      <div className="flex justify-between mb-1">
        <span className="text-muted-foreground text-xs">GC Content</span>
        <span className={`${colorClass} text-sm font-bold`}>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ValidationRow({ label, status, detail }: { label: string; status: string; detail?: string }) {
  const icons: Record<string, string> = { pass: "✓", fail: "✗", warn: "⚠", pending: "○" };
  const colors: Record<string, string> = { pass: "text-primary", fail: "text-destructive", warn: "text-warning", pending: "text-muted-foreground" };
  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-border last:border-b-0">
      <span className={`${colors[status]} text-sm w-4 text-center`}>{icons[status]}</span>
      <span className="flex-1 text-muted-foreground text-xs">{label}</span>
      {detail && <span className={`${colors[status]} text-xs`}>{detail}</span>}
    </div>
  );
}

export default function SynBioDesign() {
  const { orgId } = useOrgContext();
  const { user } = useAuth();
  const { data: creditData } = useCredits(orgId);
  const creditBalance = creditData?.balance ?? 0;
  const { t } = useTranslation();
  const { data: dbDesigns = [], refetch: refetchDesigns } = useSynBioDesigns();
  const createDesign = useCreateSynBioDesign();
  const [seqTab, setSeqTab] = useState("DNA");
  const [seqName, setSeqName] = useState("pET245");
  const [sequence, setSequenceRaw] = useState(() => {
    const saved = localStorage.getItem("synbio-sequence");
    return saved !== null ? saved : SAMPLE_SEQUENCE;
  });
  const setSequence = (val: string) => {
    setSequenceRaw(val);
    localStorage.setItem("synbio-sequence", val);
  };
  const [assemblyType, setAssemblyType] = useState("Golden Gate");
  const [hostOrganism, setHostOrganism] = useState("CHO cells");
  const [codonOrg, setCodonOrg] = useState("S. cerevisiae");
  const [validationRun, setValidationRun] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [exported, setExported] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [showCreditConfirm, setShowCreditConfirm] = useState(false);
  const [exportFormat, setExportFormat] = useState<"fasta" | "genbank" | "json">("genbank");

  // ── Memoized calculations ──────────────────────────────────────────
  const bp = useMemo(() => calcBP(sequence), [sequence]);
  const gc = useMemo(() => calcGC(sequence), [sequence]);
  const kbSize = (bp / 1000).toFixed(1) + " kb";
  const cai = useMemo(() => calculateCAI(sequence, codonOrg), [sequence, codonOrg]);
  const rareCodons = useMemo(() => findRareCodons(sequence, codonOrg), [sequence, codonOrg]);
  const restrictionSites = useMemo(() => analyzeRestrictionSites(sequence), [sequence]);
  const orfs = useMemo(() => findAllORFs(sequence, 20), [sequence]);

  // ── Auto-validation on sequence/settings change (debounced) ────────
  const autoValidateTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!sequence.trim()) {
      setValidationResults([]);
      setValidationRun(false);
      return;
    }
    clearTimeout(autoValidateTimer.current);
    autoValidateTimer.current = setTimeout(() => {
      setValidationResults(runFullValidation(sequence, assemblyType, codonOrg));
      setValidationRun(true);
    }, 400);
    return () => clearTimeout(autoValidateTimer.current);
  }, [sequence, assemblyType, codonOrg]);

  const validationPasses = useMemo(
    () => validationResults.filter(r => r.status === "pass").length,
    [validationResults]
  );

  const constructScore = useMemo(
    () => calculateConstructScore(sequence, assemblyType, codonOrg, cai, gc, validationPasses, validationResults.length),
    [sequence, assemblyType, codonOrg, cai, gc, validationPasses, validationResults.length]
  );

  // ── Handlers ───────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (!savedDesigns.find(d => d.name === seqName)) {
      setSavedDesigns(prev => [...prev, { name: seqName, type: seqTab }]);
    }
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 900);
  }, [seqName, seqTab, savedDesigns]);

  const handleRunValidation = useCallback(() => {
    setValidationResults(runFullValidation(sequence, assemblyType, codonOrg));
    setValidationRun(true);
  }, [sequence, assemblyType, codonOrg]);

  const handleOptimize = useCallback(() => {
    setOptimizing(true);
    setTimeout(() => {
      const result = optimizeSequence(sequence, codonOrg);
      setSequence(result.optimized);
      toast.success(`Optimized: ${result.changes} codons changed. CAI: ${result.caiBefor.toFixed(3)} → ${result.caiAfter.toFixed(3)}`);
      setOptimizing(false);
    }, 400);
  }, [sequence, codonOrg]);

  const handleExport = useCallback(() => {
    const exportData = {
      name: seqName,
      sequence,
      sequenceType: seqTab,
      assemblyType,
      hostOrganism,
      gcContent: gc,
      cai,
      orfs,
      restrictionSites,
    };

    if (exportFormat === "fasta") {
      downloadFile(exportFASTA(exportData), `${seqName}.fasta`, "text/plain");
    } else if (exportFormat === "genbank") {
      downloadFile(exportGenBank(exportData), `${seqName}.gb`, "text/plain");
    } else {
      downloadFile(exportJSON(exportData), `${seqName}.json`, "application/json");
    }
    setExported(true);
    setTimeout(() => setExported(false), 1500);
  }, [seqName, sequence, seqTab, assemblyType, hostOrganism, gc, cai, orfs, restrictionSites, exportFormat]);

  return (
    <div className="min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t("tools.synbio.title")}</h1>
        <p className="mt-1 text-primary text-sm">{t("tools.synbio.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Sequence Tools */}
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h2 className="text-base font-bold text-foreground mb-4">{t("tools.synbio.sequenceTools")}</h2>
            <div className="flex bg-secondary rounded-lg p-1 mb-4 gap-0.5">
              {["DNA", "RNA", "Protein"].map(tab => (
                <button key={tab} onClick={() => setSeqTab(tab)} className={`flex-1 py-1.5 rounded-md text-sm transition-colors ${seqTab === tab ? "bg-background text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}>
                  {tab}
                </button>
              ))}
            </div>

            <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1.5 mt-3">Sequence Name</label>
            <input value={seqName} onChange={e => setSeqName(e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />

            <div className="flex items-center justify-between mb-1.5 mt-3">
              <label className="block text-xs text-muted-foreground uppercase tracking-wider">Sequence</label>
              {sequence.trim() && (
                <button
                  type="button"
                  onClick={() => setSequence("")}
                  className="text-[10px] px-1.5 py-0.5 rounded border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <textarea
              value={sequence}
              onChange={e => setSequence(e.target.value)}
              rows={5}
              spellCheck={false}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-xs leading-relaxed resize-y break-all font-mono focus:outline-none focus:ring-1 focus:ring-primary text-cyan-400"
            />
            <div className="flex justify-between mt-1.5 mb-3">
              <button type="button" onClick={handleRunValidation} className="text-primary text-xs hover:underline cursor-pointer font-medium">Validate</button>
              <span className="text-muted-foreground text-xs">{bp} bp • {seqName} • CAI: {cai.toFixed(3)}</span>
            </div>

            {/* DNA Tools Toolbar */}
            <SequenceToolbar
              sequence={sequence}
              onSequenceChange={setSequence}
              sequenceType={seqTab}
            />

            {/* Rare codons warning */}
            {rareCodons.length > 0 && (
              <div className="mt-3 p-2.5 rounded-lg border border-warning/30 bg-warning/5">
                <div className="text-xs font-medium text-warning mb-1">⚠ {rareCodons.length} rare codon{rareCodons.length > 1 ? "s" : ""} for {codonOrg}</div>
                <div className="text-[10px] text-muted-foreground">
                  {rareCodons.slice(0, 5).map(r => `${r.codon}→${r.aa} @${r.position}`).join(", ")}
                  {rareCodons.length > 5 && ` +${rareCodons.length - 5} more`}
                </div>
              </div>
            )}

            <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1.5 mt-4">Assembly Type</label>
            <select value={assemblyType} onChange={e => setAssemblyType(e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-foreground text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary">
              {[
                { group: "Standard", items: ["Golden Gate", "Gibson Assembly", "BioBrick", "MoClo", "SLIC"] },
                { group: "High Value", items: ["LCR (Ligase Cycling Reaction)", "TOPO Cloning", "Restriction-Ligation", "In-Fusion", "USER Cloning", "SLiCE"] },
                { group: "Specialized", items: ["BASIC Assembly", "2Ab Assembly", "Seamless Ligation", "Type IIS Restriction", "Overlap Extension PCR", "Yeast Homologous Recombination"] },
              ].map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map(o => <option key={o} value={o}>{o}</option>)}
                </optgroup>
              ))}
            </select>

            <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1.5 mt-3">Host Organism</label>
            <HostOrganismInput value={hostOrganism} onChange={setHostOrganism} />

            <div className="flex gap-2 mt-4">
              <button onClick={handleSave} className={`flex-1 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors ${saveFlash ? "bg-primary/80" : "bg-primary"} text-primary-foreground shadow-lg`}>
                💾 {saveFlash ? t("tools.synbio.saved") : t("tools.synbio.saveDesign")}
              </button>
              <button className="w-11 bg-secondary border border-border rounded-lg text-lg text-muted-foreground hover:text-foreground transition-colors">↩</button>
            </div>

            {savedDesigns.length > 0 && (
              <div className="mt-4">
                <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Saved Designs ({savedDesigns.length})</label>
                {savedDesigns.map((d, i) => (
                  <div key={i} className="bg-secondary border border-border rounded-md px-3 py-2 mb-1.5 text-muted-foreground text-xs">
                    {d.name} • {d.type}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Restriction Analysis */}
          <RestrictionAnalysis sites={restrictionSites} assemblyType={assemblyType} />

          {/* AI Analysis */}
          <SynBioAIPanel
            sequence={sequence}
            assemblyType={assemblyType}
            hostOrganism={hostOrganism}
            gcContent={gc}
            cai={cai}
            constructScore={constructScore.overall}
          />
        </div>

        {/* Right column: Plasmid + Validation + Score */}
        <div className="space-y-6">
          {/* Plasmid Designer */}
          <PlasmidDesigner name={seqName} sequence={sequence} sequenceType={seqTab} />

          {/* Construct Score */}
          <ConstructScorePanel overall={constructScore.overall} breakdown={constructScore.breakdown} />

          {/* Design Validation */}
          <div className="glass-card p-5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-base font-bold text-foreground">{t("tools.synbio.designValidation")}</span>
              <button onClick={handleRunValidation} className="px-4 py-1.5 bg-secondary border border-primary/30 text-primary rounded-md text-xs hover:bg-primary/10 transition-colors">
                ▷ Run
              </button>
            </div>

            <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Codon Optimization</label>
            <div className="flex gap-2 mb-3">
              <select value={codonOrg} onChange={e => setCodonOrg(e.target.value)} className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2.5 text-foreground text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary">
                {[
                  { group: "Bacterial", items: ["E. coli K12", "E. coli BL21", "B. subtilis", "C. glutamicum"] },
                  { group: "Yeast / Fungal", items: ["S. cerevisiae", "K. phaffii (P. pastoris)", "S. pombe", "A. niger", "A. oryzae"] },
                  { group: "Mammalian", items: ["H. sapiens", "CHO", "HEK 293", "Mus musculus", "Vero cells", "NS0"] },
                  { group: "Insect", items: ["Sf9 / Sf21", "D. melanogaster"] },
                  { group: "Plant", items: ["A. thaliana", "N. benthamiana", "Z. mays"] },
                  { group: "Other", items: ["C. elegans", "D. rerio (Zebrafish)", "Synechocystis sp.", "T. thermophilus"] },
                ].map(g => (
                  <optgroup key={g.group} label={g.group}>
                    {g.items.map(o => <option key={o} value={o}>{o}</option>)}
                  </optgroup>
                ))}
              </select>
              <button onClick={handleOptimize} disabled={optimizing} className="px-4 bg-secondary border border-primary/30 text-primary rounded-lg text-xs whitespace-nowrap hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {optimizing ? "..." : "Optimize"}
              </button>
            </div>

            <GCBar value={gc} />

            {/* CAI Bar */}
            <div className="mt-2">
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground text-xs">CAI ({codonOrg})</span>
                <span className={`text-sm font-bold ${cai >= 0.7 ? "text-primary" : cai >= 0.5 ? "text-warning" : "text-destructive"}`}>{cai.toFixed(3)}</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${cai >= 0.7 ? "bg-primary" : cai >= 0.5 ? "bg-warning" : "bg-destructive"}`}
                  style={{ width: `${cai * 100}%` }}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Assembly Validation</label>
              {!validationRun ? (
                <button
                  onClick={handleRunValidation}
                  className="w-full bg-secondary hover:bg-secondary/80 border border-dashed border-muted-foreground/30 rounded-lg p-4 text-muted-foreground hover:text-foreground text-xs text-center transition-colors cursor-pointer"
                >
                  ▶ Run validation to check assembly
                </button>
              ) : (
                <div className="bg-secondary rounded-lg px-3 py-1">
                  {validationResults.map((r, i) => <ValidationRow key={i} {...r} />)}
                </div>
              )}
            </div>
          </div>

          {/* Export */}
          <div className="glass-card p-5">
            <h3 className="text-base font-bold text-foreground mb-3">Export Construct</h3>
            <div className="flex gap-1.5 mb-3">
              {([
                { key: "genbank" as const, label: "GenBank (.gb)", icon: "🧬" },
                { key: "fasta" as const, label: "FASTA", icon: "📄" },
                { key: "json" as const, label: "JSON", icon: "{ }" },
              ]).map(f => (
                <button
                  key={f.key}
                  onClick={() => setExportFormat(f.key)}
                  className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                    exportFormat === f.key
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {f.icon} {f.label}
                </button>
              ))}
            </div>

            <CreditCostPreview balance={creditBalance} cost={10} label="Design Export Cost" estimatedTime="Instant" />
            <CreditGate balance={creditBalance} cost={10} />
            <CreditConfirmDialog
              open={showCreditConfirm}
              onOpenChange={setShowCreditConfirm}
              cost={10}
              balance={creditBalance}
              jobLabel={`SynBio Export (${seqName} — ${exportFormat.toUpperCase()})`}
              estimatedTime="Instant"
              onConfirm={handleExport}
            />
            <button
              onClick={() => setShowCreditConfirm(true)}
              disabled={creditBalance < 10}
              className="w-full py-3.5 bg-gradient-to-r from-warning to-warning/80 text-primary-foreground font-extrabold text-base rounded-xl flex items-center justify-center gap-2.5 shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⬇ {exported ? t("tools.synbio.exported") : `Export ${exportFormat.toUpperCase()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
