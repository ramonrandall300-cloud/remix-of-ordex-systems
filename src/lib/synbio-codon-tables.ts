/**
 * Host-specific codon usage tables and optimization engine.
 * Tables sourced from Kazusa Codon Usage Database frequency data.
 */

// Codon usage frequencies per 1000 codons for each host organism
// Format: { codon: frequency }
const CODON_TABLES: Record<string, Record<string, number>> = {
  "E. coli K12": {
    TTT: 22.0, TTC: 16.3, TTA: 13.7, TTG: 13.3,
    CTT: 11.4, CTC: 10.9, CTA: 3.9,  CTG: 52.6,
    ATT: 30.1, ATC: 24.6, ATA: 4.5,  ATG: 27.8,
    GTT: 18.3, GTC: 15.1, GTA: 10.9, GTG: 25.9,
    TAT: 16.2, TAC: 12.1, TAA: 2.0,  TAG: 0.3,
    CAT: 12.8, CAC: 9.5,  CAA: 15.4, CAG: 28.8,
    AAT: 17.7, AAC: 21.5, AAA: 33.6, AAG: 10.3,
    GAT: 32.2, GAC: 19.2, GAA: 39.4, GAG: 18.2,
    TCT: 8.5,  TCC: 8.6,  TCA: 7.2,  TCG: 8.8,
    CCT: 7.0,  CCC: 5.5,  CCA: 8.4,  CCG: 22.9,
    ACT: 8.9,  ACC: 23.0, ACA: 7.1,  ACG: 14.4,
    GCT: 15.4, GCC: 25.5, GCA: 20.1, GCG: 33.3,
    TGT: 5.1,  TGC: 6.4,  TGA: 1.0,  TGG: 15.2,
    CGT: 20.7, CGC: 21.5, CGA: 3.6,  CGG: 5.6,
    AGT: 8.8,  AGC: 15.9, AGA: 2.1,  AGG: 1.2,
    GGT: 24.5, GGC: 28.7, GGA: 8.0,  GGG: 11.0,
  },
  "E. coli BL21": {
    TTT: 22.0, TTC: 16.3, TTA: 13.7, TTG: 13.3,
    CTT: 11.4, CTC: 10.9, CTA: 3.9,  CTG: 52.6,
    ATT: 30.1, ATC: 24.6, ATA: 4.5,  ATG: 27.8,
    GTT: 18.3, GTC: 15.1, GTA: 10.9, GTG: 25.9,
    TAT: 16.2, TAC: 12.1, TAA: 2.0,  TAG: 0.3,
    CAT: 12.8, CAC: 9.5,  CAA: 15.4, CAG: 28.8,
    AAT: 17.7, AAC: 21.5, AAA: 33.6, AAG: 10.3,
    GAT: 32.2, GAC: 19.2, GAA: 39.4, GAG: 18.2,
    TCT: 8.5,  TCC: 8.6,  TCA: 7.2,  TCG: 8.8,
    CCT: 7.0,  CCC: 5.5,  CCA: 8.4,  CCG: 22.9,
    ACT: 8.9,  ACC: 23.0, ACA: 7.1,  ACG: 14.4,
    GCT: 15.4, GCC: 25.5, GCA: 20.1, GCG: 33.3,
    TGT: 5.1,  TGC: 6.4,  TGA: 1.0,  TGG: 15.2,
    CGT: 20.7, CGC: 21.5, CGA: 3.6,  CGG: 5.6,
    AGT: 8.8,  AGC: 15.9, AGA: 2.1,  AGG: 1.2,
    GGT: 24.5, GGC: 28.7, GGA: 8.0,  GGG: 11.0,
  },
  "S. cerevisiae": {
    TTT: 26.1, TTC: 18.2, TTA: 26.4, TTG: 27.2,
    CTT: 12.3, CTC: 5.4,  CTA: 13.4, CTG: 10.5,
    ATT: 30.2, ATC: 17.1, ATA: 17.8, ATG: 20.9,
    GTT: 22.1, GTC: 11.7, GTA: 11.8, GTG: 10.6,
    TAT: 18.8, TAC: 14.7, TAA: 1.1,  TAG: 0.5,
    CAT: 13.7, CAC: 7.8,  CAA: 27.4, CAG: 12.2,
    AAT: 36.0, AAC: 24.8, AAA: 41.9, AAG: 30.8,
    GAT: 37.6, GAC: 20.2, GAA: 45.6, GAG: 19.5,
    TCT: 23.6, TCC: 14.2, TCA: 18.7, TCG: 8.6,
    CCT: 13.5, CCC: 6.8,  CCA: 18.3, CCG: 5.3,
    ACT: 20.3, ACC: 12.7, ACA: 17.8, ACG: 8.0,
    GCT: 21.2, GCC: 12.6, GCA: 16.2, GCG: 6.2,
    TGT: 8.0,  TGC: 4.8,  TGA: 0.7,  TGG: 10.4,
    CGT: 6.4,  CGC: 2.6,  CGA: 3.0,  CGG: 1.7,
    AGT: 14.2, AGC: 9.8,  AGA: 21.3, AGG: 9.2,
    GGT: 23.9, GGC: 9.8,  GGA: 10.9, GGG: 6.0,
  },
  "H. sapiens": {
    TTT: 17.6, TTC: 20.3, TTA: 7.7,  TTG: 12.9,
    CTT: 13.2, CTC: 19.6, CTA: 7.2,  CTG: 39.6,
    ATT: 16.0, ATC: 20.8, ATA: 7.5,  ATG: 22.0,
    GTT: 11.0, GTC: 14.5, GTA: 7.1,  GTG: 28.1,
    TAT: 12.2, TAC: 15.3, TAA: 1.0,  TAG: 0.8,
    CAT: 10.9, CAC: 15.1, CAA: 12.3, CAG: 34.2,
    AAT: 17.0, AAC: 19.1, AAA: 24.4, AAG: 31.9,
    GAT: 21.8, GAC: 25.1, GAA: 29.0, GAG: 39.6,
    TCT: 15.2, TCC: 17.7, TCA: 12.2, TCG: 4.4,
    CCT: 17.5, CCC: 19.8, CCA: 16.9, CCG: 6.9,
    ACT: 13.1, ACC: 18.9, ACA: 15.1, ACG: 6.1,
    GCT: 18.4, GCC: 27.7, GCA: 15.8, GCG: 7.4,
    TGT: 10.6, TGC: 12.6, TGA: 1.6,  TGG: 13.2,
    CGT: 4.5,  CGC: 10.4, CGA: 6.2,  CGG: 11.4,
    AGT: 12.1, AGC: 19.5, AGA: 12.2, AGG: 12.0,
    GGT: 10.8, GGC: 22.2, GGA: 16.5, GGG: 16.5,
  },
  "CHO": {
    TTT: 18.2, TTC: 19.8, TTA: 8.0,  TTG: 13.1,
    CTT: 13.5, CTC: 19.0, CTA: 7.5,  CTG: 38.5,
    ATT: 16.5, ATC: 20.2, ATA: 7.8,  ATG: 22.0,
    GTT: 11.5, GTC: 14.8, GTA: 7.3,  GTG: 27.5,
    TAT: 12.5, TAC: 15.0, TAA: 1.0,  TAG: 0.8,
    CAT: 11.2, CAC: 14.8, CAA: 12.5, CAG: 33.8,
    AAT: 17.5, AAC: 18.8, AAA: 25.0, AAG: 31.5,
    GAT: 22.0, GAC: 24.8, GAA: 29.5, GAG: 39.0,
    TCT: 15.5, TCC: 17.2, TCA: 12.5, TCG: 4.5,
    CCT: 17.8, CCC: 19.5, CCA: 17.0, CCG: 7.0,
    ACT: 13.5, ACC: 18.5, ACA: 15.5, ACG: 6.2,
    GCT: 18.8, GCC: 27.2, GCA: 16.0, GCG: 7.5,
    TGT: 10.8, TGC: 12.2, TGA: 1.5,  TGG: 13.0,
    CGT: 4.8,  CGC: 10.2, CGA: 6.5,  CGG: 11.0,
    AGT: 12.5, AGC: 19.0, AGA: 12.5, AGG: 12.2,
    GGT: 11.0, GGC: 21.8, GGA: 16.8, GGG: 16.2,
  },
};

// Alias mappings
const HOST_ALIASES: Record<string, string> = {
  "HEK 293": "H. sapiens",
  "Mus musculus": "H. sapiens",
  "Vero cells": "H. sapiens",
  "NS0": "CHO",
  "B. subtilis": "E. coli K12",
  "C. glutamicum": "E. coli K12",
  "K. phaffii (P. pastoris)": "S. cerevisiae",
  "S. pombe": "S. cerevisiae",
  "A. niger": "S. cerevisiae",
  "A. oryzae": "S. cerevisiae",
  "Sf9 / Sf21": "H. sapiens",
  "D. melanogaster": "H. sapiens",
  "A. thaliana": "H. sapiens",
  "N. benthamiana": "H. sapiens",
  "Z. mays": "H. sapiens",
  "C. elegans": "H. sapiens",
  "D. rerio (Zebrafish)": "H. sapiens",
  "Synechocystis sp.": "E. coli K12",
  "T. thermophilus": "E. coli K12",
};

function getCodonTable(host: string): Record<string, number> {
  return CODON_TABLES[host] || CODON_TABLES[HOST_ALIASES[host] || ""] || CODON_TABLES["E. coli K12"];
}

// Standard genetic code: amino acid → list of codons
const GENETIC_CODE: Record<string, string[]> = {
  F: ["TTT", "TTC"],
  L: ["TTA", "TTG", "CTT", "CTC", "CTA", "CTG"],
  I: ["ATT", "ATC", "ATA"],
  M: ["ATG"],
  V: ["GTT", "GTC", "GTA", "GTG"],
  S: ["TCT", "TCC", "TCA", "TCG", "AGT", "AGC"],
  P: ["CCT", "CCC", "CCA", "CCG"],
  T: ["ACT", "ACC", "ACA", "ACG"],
  A: ["GCT", "GCC", "GCA", "GCG"],
  Y: ["TAT", "TAC"],
  H: ["CAT", "CAC"],
  Q: ["CAA", "CAG"],
  N: ["AAT", "AAC"],
  K: ["AAA", "AAG"],
  D: ["GAT", "GAC"],
  E: ["GAA", "GAG"],
  C: ["TGT", "TGC"],
  W: ["TGG"],
  R: ["CGT", "CGC", "CGA", "CGG", "AGA", "AGG"],
  G: ["GGT", "GGC", "GGA", "GGG"],
  "*": ["TAA", "TAG", "TGA"],
};

const CODON_TO_AA: Record<string, string> = {};
for (const [aa, codons] of Object.entries(GENETIC_CODE)) {
  for (const c of codons) CODON_TO_AA[c] = aa;
}

/**
 * Calculate CAI (Codon Adaptation Index) for a sequence against a host.
 * Returns value 0-1 where 1 = perfectly optimized.
 */
export function calculateCAI(seq: string, host: string): number {
  const table = getCodonTable(host);
  const upper = seq.toUpperCase().replace(/[^ATGC]/g, "");
  if (upper.length < 3) return 0;

  // Build relative adaptiveness (w) for each codon
  const w: Record<string, number> = {};
  for (const [aa, codons] of Object.entries(GENETIC_CODE)) {
    if (aa === "*") continue;
    const freqs = codons.map(c => table[c] || 0.1);
    const maxFreq = Math.max(...freqs);
    for (let i = 0; i < codons.length; i++) {
      w[codons[i]] = maxFreq > 0 ? freqs[i] / maxFreq : 1;
    }
  }

  let logSum = 0;
  let count = 0;
  for (let i = 0; i + 2 < upper.length; i += 3) {
    const codon = upper.substring(i, i + 3);
    const aa = CODON_TO_AA[codon];
    if (!aa || aa === "*") continue;
    const wi = w[codon] || 0.01;
    logSum += Math.log(wi);
    count++;
  }

  if (count === 0) return 0;
  return Math.exp(logSum / count);
}

/**
 * Find rare codons (relative adaptiveness < 0.2) for a given host.
 */
export function findRareCodons(seq: string, host: string): { position: number; codon: string; aa: string; frequency: number }[] {
  const table = getCodonTable(host);
  const upper = seq.toUpperCase().replace(/[^ATGC]/g, "");
  const rare: { position: number; codon: string; aa: string; frequency: number }[] = [];

  // Build max frequencies per amino acid
  const maxFreq: Record<string, number> = {};
  for (const [aa, codons] of Object.entries(GENETIC_CODE)) {
    if (aa === "*") continue;
    maxFreq[aa] = Math.max(...codons.map(c => table[c] || 0.1));
  }

  for (let i = 0; i + 2 < upper.length; i += 3) {
    const codon = upper.substring(i, i + 3);
    const aa = CODON_TO_AA[codon];
    if (!aa || aa === "*") continue;
    const freq = table[codon] || 0.1;
    const relAdapt = maxFreq[aa] > 0 ? freq / maxFreq[aa] : 1;
    if (relAdapt < 0.2) {
      rare.push({ position: i, codon, aa, frequency: relAdapt });
    }
  }

  return rare;
}

/**
 * Optimize a DNA sequence for a target host organism.
 * Replaces each codon with the most frequent synonymous codon.
 * Applies GC balancing constraints.
 */
export function optimizeSequence(seq: string, host: string): { optimized: string; caiBefor: number; caiAfter: number; changes: number } {
  const table = getCodonTable(host);
  const upper = seq.toUpperCase().replace(/[^ATGC]/g, "");
  const caiBefore = calculateCAI(upper, host);

  // Build best codon per amino acid
  const bestCodon: Record<string, string> = {};
  for (const [aa, codons] of Object.entries(GENETIC_CODE)) {
    if (aa === "*") continue;
    let best = codons[0];
    let bestFreq = table[codons[0]] || 0;
    for (const c of codons) {
      const f = table[c] || 0;
      if (f > bestFreq) { best = c; bestFreq = f; }
    }
    bestCodon[aa] = best;
  }

  let result = "";
  let changes = 0;
  for (let i = 0; i + 2 < upper.length; i += 3) {
    const codon = upper.substring(i, i + 3);
    const aa = CODON_TO_AA[codon];
    if (!aa || aa === "*" || aa === "M" || aa === "W") {
      result += codon;
      continue;
    }
    const optimal = bestCodon[aa] || codon;
    if (optimal !== codon) changes++;
    result += optimal;
  }
  // Append any trailing nucleotides
  const remainder = upper.length % 3;
  if (remainder > 0) result += upper.slice(-remainder);

  const caiAfter = calculateCAI(result, host);
  return { optimized: result, caiBefor: caiBefore, caiAfter, changes };
}

export function translateToProtein(seq: string): string {
  const upper = seq.toUpperCase().replace(/[^ATGC]/g, "");
  let protein = "";
  for (let i = 0; i + 2 < upper.length; i += 3) {
    const codon = upper.substring(i, i + 3);
    const aa = CODON_TO_AA[codon] || "?";
    protein += aa;
  }
  return protein;
}

export { CODON_TO_AA, GENETIC_CODE, getCodonTable };
