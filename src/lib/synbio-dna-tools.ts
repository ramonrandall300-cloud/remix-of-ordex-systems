/**
 * Core DNA analysis tools: reverse complement, ORF finder,
 * restriction enzyme analysis, primer design.
 */

// ── Complement & Reverse Complement ──────────────────────────────────
const COMPLEMENT: Record<string, string> = {
  A: "T", T: "A", G: "C", C: "G",
  a: "t", t: "a", g: "c", c: "g",
  U: "A", u: "a",
};

export function complement(seq: string): string {
  return seq.split("").map(c => COMPLEMENT[c] || c).join("");
}

export function reverseComplement(seq: string): string {
  return complement(seq).split("").reverse().join("");
}

// ── ORF Finder ──────────────────────────────────────────────────────
export interface ORF {
  frame: number; // 1-6 (1-3 forward, 4-6 reverse)
  start: number;
  end: number;
  length: number; // in amino acids
  strand: "+" | "-";
  sequence: string; // nucleotide sequence of the ORF
}

const STOP_CODONS = new Set(["TAA", "TAG", "TGA"]);

function findORFsInStrand(seq: string, strand: "+" | "-", minAA: number = 30): ORF[] {
  const orfs: ORF[] = [];
  const upper = seq.toUpperCase();

  for (let frame = 0; frame < 3; frame++) {
    let orfStart = -1;
    for (let i = frame; i + 2 < upper.length; i += 3) {
      const codon = upper.substring(i, i + 3);
      if (codon === "ATG" && orfStart === -1) {
        orfStart = i;
      }
      if (STOP_CODONS.has(codon) && orfStart !== -1) {
        const aaLen = (i - orfStart) / 3;
        if (aaLen >= minAA) {
          orfs.push({
            frame: strand === "+" ? frame + 1 : frame + 4,
            start: orfStart,
            end: i + 3,
            length: aaLen,
            strand,
            sequence: upper.substring(orfStart, i + 3),
          });
        }
        orfStart = -1;
      }
    }
  }
  return orfs;
}

export function findAllORFs(seq: string, minAA: number = 30): ORF[] {
  const clean = seq.toUpperCase().replace(/[^ATGC]/g, "");
  const forward = findORFsInStrand(clean, "+", minAA);
  const rc = reverseComplement(clean);
  const reverse = findORFsInStrand(rc, "-", minAA).map(orf => ({
    ...orf,
    // Map positions back to original sequence
    start: clean.length - orf.end,
    end: clean.length - orf.start,
  }));
  return [...forward, ...reverse].sort((a, b) => b.length - a.length);
}

// ── Restriction Enzyme Analysis ─────────────────────────────────────
export interface RestrictionSite {
  enzyme: string;
  position: number;
  cutPosition: number; // where the enzyme cuts relative to recognition site start
  sequence: string;
  overhang: "sticky-5" | "sticky-3" | "blunt";
  overhangSeq: string;
  compatible: string[]; // assembly methods this is compatible with
}

interface EnzymeInfo {
  pattern: string;
  cutOffset: number; // cut position relative to start of recognition site (top strand)
  cutOffsetBottom: number; // bottom strand cut
  overhang: "sticky-5" | "sticky-3" | "blunt";
  compatible: string[];
}

const ENZYME_DB: Record<string, EnzymeInfo> = {
  EcoRI:   { pattern: "GAATTC",   cutOffset: 1, cutOffsetBottom: 5, overhang: "sticky-5", compatible: ["BioBrick", "Restriction-Ligation"] },
  BamHI:   { pattern: "GGATCC",   cutOffset: 1, cutOffsetBottom: 5, overhang: "sticky-5", compatible: ["Restriction-Ligation"] },
  HindIII: { pattern: "AAGCTT",   cutOffset: 1, cutOffsetBottom: 5, overhang: "sticky-5", compatible: ["Restriction-Ligation"] },
  XhoI:    { pattern: "CTCGAG",   cutOffset: 1, cutOffsetBottom: 5, overhang: "sticky-5", compatible: ["Restriction-Ligation"] },
  NcoI:    { pattern: "CCATGG",   cutOffset: 1, cutOffsetBottom: 5, overhang: "sticky-5", compatible: ["Restriction-Ligation"] },
  NdeI:    { pattern: "CATATG",   cutOffset: 2, cutOffsetBottom: 4, overhang: "sticky-5", compatible: ["Restriction-Ligation"] },
  BglII:   { pattern: "AGATCT",   cutOffset: 1, cutOffsetBottom: 5, overhang: "sticky-5", compatible: ["Restriction-Ligation"] },
  SalI:    { pattern: "GTCGAC",   cutOffset: 1, cutOffsetBottom: 5, overhang: "sticky-5", compatible: ["Restriction-Ligation"] },
  XbaI:    { pattern: "TCTAGA",   cutOffset: 1, cutOffsetBottom: 5, overhang: "sticky-5", compatible: ["BioBrick", "Restriction-Ligation"] },
  PstI:    { pattern: "CTGCAG",   cutOffset: 5, cutOffsetBottom: 1, overhang: "sticky-3", compatible: ["BioBrick", "Restriction-Ligation"] },
  SpeI:    { pattern: "ACTAGT",   cutOffset: 1, cutOffsetBottom: 5, overhang: "sticky-5", compatible: ["BioBrick", "Restriction-Ligation"] },
  NotI:    { pattern: "GCGGCCGC", cutOffset: 2, cutOffsetBottom: 6, overhang: "sticky-5", compatible: ["Restriction-Ligation"] },
  KpnI:    { pattern: "GGTACC",   cutOffset: 5, cutOffsetBottom: 1, overhang: "sticky-3", compatible: ["Restriction-Ligation"] },
  SacI:    { pattern: "GAGCTC",   cutOffset: 5, cutOffsetBottom: 1, overhang: "sticky-3", compatible: ["Restriction-Ligation"] },
  SmaI:    { pattern: "CCCGGG",   cutOffset: 3, cutOffsetBottom: 3, overhang: "blunt", compatible: ["Restriction-Ligation"] },
  BsaI:    { pattern: "GGTCTC",   cutOffset: 7, cutOffsetBottom: 11, overhang: "sticky-5", compatible: ["Golden Gate", "MoClo"] },
  BbsI:    { pattern: "GAAGAC",   cutOffset: 8, cutOffsetBottom: 12, overhang: "sticky-5", compatible: ["Golden Gate"] },
  BsmBI:   { pattern: "CGTCTC",   cutOffset: 7, cutOffsetBottom: 11, overhang: "sticky-5", compatible: ["Golden Gate", "MoClo"] },
};

export function analyzeRestrictionSites(seq: string): RestrictionSite[] {
  const upper = seq.toUpperCase().replace(/[^ATGC]/g, "");
  const sites: RestrictionSite[] = [];

  for (const [enzyme, info] of Object.entries(ENZYME_DB)) {
    let idx = 0;
    while ((idx = upper.indexOf(info.pattern, idx)) !== -1) {
      const overhangStart = Math.min(info.cutOffset, info.cutOffsetBottom);
      const overhangEnd = Math.max(info.cutOffset, info.cutOffsetBottom);
      const overhangSeq = info.pattern.substring(overhangStart, overhangEnd);

      sites.push({
        enzyme,
        position: idx,
        cutPosition: idx + info.cutOffset,
        sequence: info.pattern,
        overhang: info.overhang,
        overhangSeq,
        compatible: info.compatible,
      });
      idx += 1;
    }
  }

  return sites.sort((a, b) => a.position - b.position);
}

// ── Primer Design ───────────────────────────────────────────────────
export interface Primer {
  name: string;
  sequence: string;
  tm: number;
  gcPercent: number;
  length: number;
  gcClamp: boolean;
  hairpinRisk: boolean;
}

function calcTm(seq: string): number {
  const upper = seq.toUpperCase();
  const len = upper.length;
  if (len === 0) return 0;

  // Simplified Nearest-Neighbor approximation
  const gc = (upper.match(/[GC]/g) || []).length;
  const at = (upper.match(/[AT]/g) || []).length;

  if (len < 14) {
    return 2 * at + 4 * gc;
  }
  // Wallace rule with salt correction
  return 64.9 + 41 * (gc - 16.4) / len;
}

function hasGCClamp(seq: string): boolean {
  const last3 = seq.toUpperCase().slice(-3);
  const gcCount = (last3.match(/[GC]/g) || []).length;
  return gcCount >= 1 && gcCount <= 2;
}

function hasHairpinRisk(seq: string): boolean {
  const upper = seq.toUpperCase();
  // Check for self-complementary regions (≥4 bp)
  for (let i = 0; i <= upper.length - 4; i++) {
    const sub = upper.substring(i, i + 4);
    const rc = reverseComplement(sub);
    if (upper.indexOf(rc, i + 4) !== -1) return true;
  }
  return false;
}

export function designPrimers(seq: string, targetLen: number = 20): { forward: Primer; reverse: Primer } {
  const upper = seq.toUpperCase().replace(/[^ATGC]/g, "");
  const len = Math.min(targetLen, Math.floor(upper.length / 2));

  const fwdSeq = upper.substring(0, len);
  const revSeq = reverseComplement(upper.substring(upper.length - len));

  function makePrimer(name: string, s: string): Primer {
    const gc = ((s.match(/[GC]/g) || []).length / s.length) * 100;
    return {
      name,
      sequence: s,
      tm: calcTm(s),
      gcPercent: gc,
      length: s.length,
      gcClamp: hasGCClamp(s),
      hairpinRisk: hasHairpinRisk(s),
    };
  }

  return {
    forward: makePrimer("Forward", fwdSeq),
    reverse: makePrimer("Reverse", revSeq),
  };
}

// ── Construct Scoring ───────────────────────────────────────────────
export interface ConstructScore {
  overall: number; // 0-100
  breakdown: {
    label: string;
    score: number; // 0-100
    weight: number;
    detail: string;
  }[];
}

export function calculateConstructScore(
  seq: string,
  assemblyType: string,
  host: string,
  cai: number,
  gc: number,
  validationPasses: number,
  validationTotal: number,
): ConstructScore {
  const upper = seq.toUpperCase().replace(/[^ATGC]/g, "");
  const bp = upper.length;

  // 1. GC stability (ideal 40-60%)
  const gcScore = gc >= 40 && gc <= 60 ? 100 :
    gc >= 30 && gc <= 70 ? 70 :
    gc >= 20 && gc <= 80 ? 40 : 10;

  // 2. Codon optimization
  const caiScore = Math.round(cai * 100);

  // 3. Cloning compatibility (based on validation results)
  const cloningScore = validationTotal > 0 ? Math.round((validationPasses / validationTotal) * 100) : 50;

  // 4. Expression likelihood
  const hasStart = upper.startsWith("ATG");
  const stopCodons = ["TAA", "TAG", "TGA"];
  const hasStop = stopCodons.includes(upper.slice(-3));
  const inFrame = bp % 3 === 0;
  let expressionScore = 50;
  if (hasStart) expressionScore += 20;
  if (hasStop) expressionScore += 15;
  if (inFrame) expressionScore += 15;

  const breakdown = [
    { label: "GC Stability", score: gcScore, weight: 0.25, detail: `${gc.toFixed(1)}% GC` },
    { label: "Codon Optimization", score: caiScore, weight: 0.25, detail: `CAI: ${cai.toFixed(3)}` },
    { label: "Cloning Compatibility", score: cloningScore, weight: 0.25, detail: `${validationPasses}/${validationTotal} checks passed` },
    { label: "Expression Likelihood", score: expressionScore, weight: 0.25, detail: `${[hasStart && "ATG✓", inFrame && "frame✓", hasStop && "stop✓"].filter(Boolean).join(", ") || "—"}` },
  ];

  const overall = Math.round(breakdown.reduce((sum, b) => sum + b.score * b.weight, 0));
  return { overall, breakdown };
}
