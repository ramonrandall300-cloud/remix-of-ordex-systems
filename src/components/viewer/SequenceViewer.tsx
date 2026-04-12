import { useMemo, useRef, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Residue {
  resName: string;
  resSeq: number;
  chain: string;
}

// Amino acid 3-letter → 1-letter mapping
const AA3TO1: Record<string, string> = {
  ALA: "A", ARG: "R", ASN: "N", ASP: "D", CYS: "C",
  GLN: "Q", GLU: "E", GLY: "G", HIS: "H", ILE: "I",
  LEU: "L", LYS: "K", MET: "M", PHE: "F", PRO: "P",
  SER: "S", THR: "T", TRP: "W", TYR: "Y", VAL: "V",
};

// Secondary structure type colors
const SS_COLORS: Record<string, string> = {
  H: "hsl(var(--primary))",      // helix
  E: "hsl(210 60% 50%)",         // sheet
  C: "hsl(var(--muted-foreground))", // coil
};

interface SequenceViewerProps {
  pdbData: string | null;
  selectedResidue: { resName: string; resNum: number; chain: string } | null;
  onResidueClick: (resName: string, resNum: number, chain: string) => void;
  viewerRef: React.MutableRefObject<any>;
}

export default function SequenceViewer({ pdbData, selectedResidue, onResidueClick, viewerRef }: SequenceViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const residues = useMemo(() => {
    if (!pdbData) return [];
    const seen = new Set<string>();
    const result: Residue[] = [];
    for (const line of pdbData.split("\n")) {
      if (!line.startsWith("ATOM")) continue;
      const chain = line.substring(21, 22).trim();
      const resSeq = parseInt(line.substring(22, 26).trim()) || 0;
      const resName = line.substring(17, 20).trim();
      const key = `${chain}_${resSeq}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ resName, resSeq, chain });
      }
    }
    return result;
  }, [pdbData]);

  // Parse secondary structure from HELIX/SHEET records
  const ssMap = useMemo(() => {
    if (!pdbData) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const line of pdbData.split("\n")) {
      if (line.startsWith("HELIX")) {
        const chain = line.substring(19, 20).trim();
        const start = parseInt(line.substring(21, 25).trim()) || 0;
        const end = parseInt(line.substring(33, 37).trim()) || 0;
        for (let i = start; i <= end; i++) map.set(`${chain}_${i}`, "H");
      } else if (line.startsWith("SHEET")) {
        const chain = line.substring(21, 22).trim();
        const start = parseInt(line.substring(22, 26).trim()) || 0;
        const end = parseInt(line.substring(33, 37).trim()) || 0;
        for (let i = start; i <= end; i++) map.set(`${chain}_${i}`, "E");
      }
    }
    return map;
  }, [pdbData]);

  // Scroll selected residue into view
  useEffect(() => {
    if (!selectedResidue || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-res="${selectedResidue.chain}_${selectedResidue.resNum}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  }, [selectedResidue]);

  const handleClick = useCallback((res: Residue) => {
    onResidueClick(res.resName, res.resSeq, res.chain);

    // Highlight in 3D viewer
    const v = viewerRef.current;
    if (v) {
      try {
        v.setStyle({}, v.getStyle?.({})?.[0] ?? { cartoon: { color: "spectrum" } });
        v.setStyle(
          { resi: res.resSeq, chain: res.chain },
          { stick: { color: "0xff6b6b", radius: 0.2 }, cartoon: { color: "0xff6b6b" } }
        );
        v.zoomTo({ resi: res.resSeq, chain: res.chain }, 500);
        v.render();
      } catch {}
    }
  }, [onResidueClick, viewerRef]);

  if (!pdbData || residues.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">Load a structure to see sequence</p>;
  }

  // Group by chain
  const chains = new Map<string, Residue[]>();
  residues.forEach((r) => {
    if (!chains.has(r.chain)) chains.set(r.chain, []);
    chains.get(r.chain)!.push(r);
  });

  return (
    <div className="space-y-2" ref={scrollRef}>
      {Array.from(chains.entries()).map(([chain, chainResidues]) => (
        <div key={chain}>
          <div className="text-[10px] text-muted-foreground font-medium mb-1">Chain {chain} ({chainResidues.length} residues)</div>
          <div className="flex flex-wrap gap-px">
            {chainResidues.map((res) => {
              const letter = AA3TO1[res.resName] || "?";
              const ss = ssMap.get(`${res.chain}_${res.resSeq}`) || "C";
              const isSelected = selectedResidue?.resNum === res.resSeq && selectedResidue?.chain === res.chain;

              return (
                <button
                  key={`${res.chain}_${res.resSeq}`}
                  data-res={`${res.chain}_${res.resSeq}`}
                  onClick={() => handleClick(res)}
                  title={`${res.resName}${res.resSeq} (${chain})`}
                  className={`w-4 h-5 text-[8px] font-mono flex items-center justify-center rounded-sm cursor-pointer transition-all border ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary scale-125 z-10"
                      : "border-transparent hover:border-primary/50 hover:scale-110"
                  }`}
                  style={{
                    backgroundColor: isSelected ? undefined : (ss === "H" ? "hsl(172 66% 50% / 0.15)" : ss === "E" ? "hsl(210 60% 50% / 0.15)" : "transparent"),
                    color: isSelected ? undefined : (SS_COLORS[ss] || "hsl(var(--muted-foreground))"),
                  }}
                >
                  {letter}
                </button>
              );
            })}
          </div>
          {/* Number ruler every 10 residues */}
          <div className="flex flex-wrap gap-px mt-0.5">
            {chainResidues.map((res, i) => (
              <div key={`n_${res.chain}_${res.resSeq}`} className="w-4 text-center">
                {res.resSeq % 10 === 0 ? (
                  <span className="text-[7px] text-muted-foreground/50">{res.resSeq}</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex gap-3 text-[9px] text-muted-foreground mt-1">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm" style={{ background: "hsl(172 66% 50% / 0.3)" }} /> Helix
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm" style={{ background: "hsl(210 60% 50% / 0.3)" }} /> Sheet
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm" style={{ background: "hsl(var(--muted) / 0.3)" }} /> Coil
        </span>
      </div>
    </div>
  );
}
