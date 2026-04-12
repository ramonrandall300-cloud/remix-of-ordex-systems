import { useState, useMemo } from "react";
import type { ORF } from "@/lib/synbio-dna-tools";
import { reverseComplement, findAllORFs, designPrimers } from "@/lib/synbio-dna-tools";
import { translateToProtein } from "@/lib/synbio-codon-tables";

interface SequenceToolbarProps {
  sequence: string;
  onSequenceChange: (seq: string) => void;
  sequenceType: string;
}

export default function SequenceToolbar({ sequence, onSequenceChange, sequenceType }: SequenceToolbarProps) {
  const [showRC, setShowRC] = useState(false);
  const [showORFs, setShowORFs] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showPrimers, setShowPrimers] = useState(false);
  const [translationFrame, setTranslationFrame] = useState(0);

  const rc = useMemo(() => reverseComplement(sequence), [sequence]);
  const orfs = useMemo(() => findAllORFs(sequence, 20), [sequence]);
  const primers = useMemo(() => designPrimers(sequence), [sequence]);

  const translation = useMemo(() => {
    const clean = sequence.toUpperCase().replace(/[^ATGC]/g, "");
    const shifted = clean.substring(translationFrame);
    return translateToProtein(shifted);
  }, [sequence, translationFrame]);

  if (sequenceType === "Protein") return null;

  return (
    <div className="space-y-3">
      {/* Tool buttons */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setShowRC(!showRC)}
          className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors border ${
            showRC ? "bg-primary/10 text-primary border-primary/30" : "bg-secondary text-muted-foreground border-border hover:text-foreground"
          }`}
        >
          🔄 Rev. Complement
        </button>
        <button
          onClick={() => onSequenceChange(rc)}
          className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-secondary text-muted-foreground border border-border hover:text-foreground transition-colors"
        >
          ↔ Flip to RC
        </button>
        <button
          onClick={() => setShowORFs(!showORFs)}
          className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors border ${
            showORFs ? "bg-primary/10 text-primary border-primary/30" : "bg-secondary text-muted-foreground border-border hover:text-foreground"
          }`}
        >
          🧬 ORFs ({orfs.length})
        </button>
        <button
          onClick={() => setShowTranslation(!showTranslation)}
          className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors border ${
            showTranslation ? "bg-primary/10 text-primary border-primary/30" : "bg-secondary text-muted-foreground border-border hover:text-foreground"
          }`}
        >
          🔬 Translate
        </button>
        <button
          onClick={() => setShowPrimers(!showPrimers)}
          className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors border ${
            showPrimers ? "bg-primary/10 text-primary border-primary/30" : "bg-secondary text-muted-foreground border-border hover:text-foreground"
          }`}
        >
          🧷 Primers
        </button>
      </div>

      {/* Reverse complement panel */}
      {showRC && (
        <div className="bg-secondary rounded-lg p-3 border border-border">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Reverse Complement</div>
          <div className="font-mono text-xs text-foreground break-all leading-relaxed max-h-24 overflow-y-auto">
            {rc}
          </div>
        </div>
      )}

      {/* ORF panel */}
      {showORFs && (
        <div className="bg-secondary rounded-lg p-3 border border-border">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
            Open Reading Frames ({orfs.length})
          </div>
          {orfs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No ORFs found (min 20 aa)</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {orfs.slice(0, 10).map((orf, i) => (
                <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded bg-background border border-border">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      orf.strand === "+" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                    }`}>
                      {orf.strand === "+" ? "→" : "←"} F{orf.frame}
                    </span>
                    <span className="text-xs font-mono text-foreground">{orf.length} aa</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {orf.start + 1}..{orf.end}
                  </span>
                </div>
              ))}
              {orfs.length > 10 && (
                <p className="text-[10px] text-muted-foreground text-center">+{orfs.length - 10} more</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Translation panel */}
      {showTranslation && (
        <div className="bg-secondary rounded-lg p-3 border border-border">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Amino Acid Translation
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map(f => (
                <button
                  key={f}
                  onClick={() => setTranslationFrame(f)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    translationFrame === f
                      ? "bg-primary text-primary-foreground font-bold"
                      : "bg-background text-muted-foreground border border-border"
                  }`}
                >
                  +{f + 1}
                </button>
              ))}
            </div>
          </div>
          <div className="font-mono text-xs text-foreground break-all leading-relaxed max-h-24 overflow-y-auto">
            {translation.split("").map((aa, i) => (
              <span
                key={i}
                className={
                  aa === "M" ? "text-green-400 font-bold" :
                  aa === "*" ? "text-red-400 font-bold" :
                  ""
                }
              >
                {aa}
              </span>
            ))}
          </div>
          <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground">
            <span><span className="text-green-400 font-bold">M</span> = Start</span>
            <span><span className="text-red-400 font-bold">*</span> = Stop</span>
            <span>{translation.length} residues</span>
          </div>
        </div>
      )}

      {/* Primer panel */}
      {showPrimers && (
        <div className="bg-secondary rounded-lg p-3 border border-border">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Primer Design</div>
          {[primers.forward, primers.reverse].map(p => (
            <div key={p.name} className="mb-2 last:mb-0 px-2 py-1.5 rounded bg-background border border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-foreground">{p.name}</span>
                <div className="flex gap-2">
                  <span className="text-[10px] text-muted-foreground">Tm: <span className="text-foreground font-mono">{p.tm.toFixed(1)}°C</span></span>
                  <span className="text-[10px] text-muted-foreground">GC: <span className="text-foreground font-mono">{p.gcPercent.toFixed(0)}%</span></span>
                </div>
              </div>
              <div className="font-mono text-xs text-primary break-all">{p.sequence}</div>
              <div className="flex gap-2 mt-1">
                {p.gcClamp && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">GC clamp ✓</span>}
                {p.hairpinRisk && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">Hairpin risk ⚠</span>}
                {!p.hairpinRisk && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">No hairpin ✓</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
