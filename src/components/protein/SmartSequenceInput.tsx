import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { AlertTriangle, CheckCircle, XCircle, Search, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchProteinFromUniProt } from "@/lib/uniprot";

// Amino acid properties for highlighting
const AA_CLASSES: Record<string, { color: string; label: string }> = {
  // Hydrophobic
  A: { color: "text-orange-400", label: "hydrophobic" },
  V: { color: "text-orange-400", label: "hydrophobic" },
  I: { color: "text-orange-400", label: "hydrophobic" },
  L: { color: "text-orange-400", label: "hydrophobic" },
  M: { color: "text-orange-400", label: "hydrophobic" },
  F: { color: "text-orange-400", label: "hydrophobic" },
  W: { color: "text-orange-400", label: "hydrophobic" },
  P: { color: "text-orange-400", label: "hydrophobic" },
  // Polar
  S: { color: "text-green-400", label: "polar" },
  T: { color: "text-green-400", label: "polar" },
  Y: { color: "text-green-400", label: "polar" },
  N: { color: "text-green-400", label: "polar" },
  Q: { color: "text-green-400", label: "polar" },
  C: { color: "text-green-400", label: "polar" },
  // Positive charge
  K: { color: "text-blue-400", label: "positive" },
  R: { color: "text-blue-400", label: "positive" },
  H: { color: "text-blue-400", label: "positive" },
  // Negative charge
  D: { color: "text-red-400", label: "negative" },
  E: { color: "text-red-400", label: "negative" },
  // Special
  G: { color: "text-purple-400", label: "special" },
};

const VALID_AA = new Set("ACDEFGHIKLMNPQRSTVWY");

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  residueCount: number;
  headerLine: string | null;
}

function validateFasta(input: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = input.trim().split("\n");
  let headerLine: string | null = null;
  let sequence = "";

  if (lines.length === 0 || !input.trim()) {
    return { valid: false, errors: ["Empty sequence"], warnings: [], residueCount: 0, headerLine: null };
  }

  // Check for FASTA header
  if (lines[0].startsWith(">")) {
    headerLine = lines[0].slice(1).trim();
    if (!headerLine) warnings.push("Header line is empty");
    sequence = lines.slice(1).join("").replace(/\s/g, "").toUpperCase();
  } else {
    // No header — treat as raw sequence
    warnings.push("No FASTA header (>) detected — treating as raw sequence");
    sequence = lines.join("").replace(/\s/g, "").toUpperCase();
  }

  if (!sequence) {
    errors.push("No amino acid sequence found");
    return { valid: false, errors, warnings, residueCount: 0, headerLine };
  }

  // Check for invalid characters
  const invalidChars = new Set<string>();
  for (const ch of sequence) {
    if (!VALID_AA.has(ch)) invalidChars.add(ch);
  }
  if (invalidChars.size > 0) {
    errors.push(`Invalid characters: ${[...invalidChars].join(", ")}`);
  }

  const residueCount = sequence.length;

  // Length warnings
  if (residueCount > 400) {
    warnings.push(`Sequence is ${residueCount} residues — ESMFold limit is ~400. Consider trimming.`);
  }
  if (residueCount < 10) {
    warnings.push("Very short sequence (<10 AA) — results may be unreliable");
  }
  if (residueCount > 2700) {
    warnings.push("Extremely long sequence (>2700 AA) — may fail or take very long");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    residueCount,
    headerLine,
  };
}

interface SmartSequenceInputProps {
  value: string;
  onChange: (val: string) => void;
  selectedModel: string;
}

export function SmartSequenceInput({ value, onChange, selectedModel }: SmartSequenceInputProps) {
  const [showHighlighted, setShowHighlighted] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importId, setImportId] = useState("");
  const [showImport, setShowImport] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const validation = useMemo(() => validateFasta(value), [value]);

  // Extract pure sequence for highlighting
  const pureSequence = useMemo(() => {
    const lines = value.trim().split("\n");
    const seqLines = lines[0]?.startsWith(">") ? lines.slice(1) : lines;
    return seqLines.join("").replace(/\s/g, "").toUpperCase();
  }, [value]);

  // Smart suggestions
  const suggestion = useMemo(() => {
    if (!pureSequence || pureSequence.length < 20) return null;

    // Simple kinase detection
    const kinaseMotifs = ["DLKPEN", "HRDLK", "VAIK", "GXGXXG"];
    for (const motif of kinaseMotifs) {
      if (motif.includes("X")) continue; // skip pattern motifs for now
      if (pureSequence.includes(motif)) return "🧠 This sequence contains kinase-like motifs. Consider using AlphaFold for better accuracy.";
    }

    // Transmembrane detection (long hydrophobic stretch)
    const hydroStretch = /[AVILMFWP]{20,}/;
    if (hydroStretch.test(pureSequence)) return "🧠 Long hydrophobic stretch detected — possible transmembrane protein.";

    // Signal peptide hint
    if (pureSequence.startsWith("M") && /^M[A-Z]{0,5}[LFIVW]{5,}/.test(pureSequence)) {
      return "🧠 Possible signal peptide at N-terminus.";
    }

    return null;
  }, [pureSequence]);

  const handleImport = useCallback(async () => {
    const id = importId.trim();
    if (!id) { toast.error("Enter a UniProt ID or gene name"); return; }
    setImportLoading(true);
    try {
      const fasta = await fetchProteinFromUniProt(id);
      onChange(fasta);
      toast.success(`Imported sequence for ${id}`);
      setShowImport(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImportLoading(false);
    }
  }, [importId, onChange]);

  // Debounced import on typing
  const handleImportIdChange = useCallback((val: string) => {
    setImportId(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground">Sequence Input</label>
        <div className="flex items-center gap-2">
          {value.trim() && (
            <button
              onClick={() => { onChange(""); setShowHighlighted(false); }}
              className="text-[10px] px-1.5 py-0.5 rounded border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setShowHighlighted(!showHighlighted)}
            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
              showHighlighted ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground"
            }`}
          >
            {showHighlighted ? "Raw" : "Highlight"}
          </button>
          <button
            onClick={() => setShowImport(!showImport)}
            className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            Import
          </button>
        </div>
      </div>

      {/* Import panel */}
      {showImport && (
        <div className="flex gap-2 p-2 bg-secondary rounded-md border border-border">
          <input
            value={importId}
            onChange={e => handleImportIdChange(e.target.value)}
            placeholder="UniProt ID (e.g. P00533) or gene name"
            className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            onKeyDown={e => e.key === "Enter" && handleImport()}
          />
          <button
            onClick={handleImport}
            disabled={importLoading}
            className="flex items-center gap-1 px-2 py-1 border border-border rounded text-xs text-foreground hover:bg-secondary disabled:opacity-50"
          >
            {importLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
            Fetch
          </button>
        </div>
      )}

      {/* Sequence textarea or highlighted view */}
      {showHighlighted && pureSequence ? (
        <div className="w-full h-32 bg-secondary border border-border rounded-md p-3 text-xs font-mono overflow-auto leading-5">
          {pureSequence.split("").map((ch, i) => {
            const cls = AA_CLASSES[ch];
            return (
              <span key={i} className={cls?.color || "text-muted-foreground"} title={cls ? `${ch}: ${cls.label}` : ch}>
                {ch}
              </span>
            );
          })}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full h-32 bg-secondary border border-border rounded-md p-3 text-xs font-mono text-cyan-400 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder=">ProteinName&#10;MEEPQSDPSVEPPLSQETFSDLWKLL..."
        />
      )}

      {/* Validation status bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {validation.valid ? (
          <span className="flex items-center gap-1 text-[10px] text-success">
            <CheckCircle className="w-3 h-3" /> Valid FASTA
          </span>
        ) : validation.errors.length > 0 ? (
          <span className="flex items-center gap-1 text-[10px] text-destructive">
            <XCircle className="w-3 h-3" /> {validation.errors[0]}
          </span>
        ) : null}
        <span className="text-[10px] text-muted-foreground ml-auto">
          {validation.residueCount} AA
          {selectedModel === "ESMFold" && validation.residueCount > 400 && (
            <span className="text-warning ml-1">⚠ over ESMFold limit</span>
          )}
        </span>
      </div>

      {/* Warnings */}
      {validation.warnings.map((w, i) => (
        <div key={i} className="flex items-start gap-1.5 text-[10px] text-warning bg-warning/5 border border-warning/20 rounded px-2 py-1">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{w}</span>
        </div>
      ))}

      {/* Smart suggestion */}
      {suggestion && (
        <div className="text-[10px] text-primary bg-primary/5 border border-primary/20 rounded px-2 py-1.5">
          {suggestion}
        </div>
      )}

      {/* Color legend */}
      {showHighlighted && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px]">
          <span className="text-orange-400">■ Hydrophobic</span>
          <span className="text-green-400">■ Polar</span>
          <span className="text-blue-400">■ Positive</span>
          <span className="text-red-400">■ Negative</span>
          <span className="text-purple-400">■ Special (G)</span>
        </div>
      )}
    </div>
  );
}
