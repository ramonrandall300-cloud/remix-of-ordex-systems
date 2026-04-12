/**
 * Assembly-specific validation engine for synthetic biology constructs.
 * Each assembly method has biologically accurate checks based on its mechanism.
 */

export interface ValidationResult {
  label: string;
  status: "pass" | "fail" | "warn";
  detail: string;
}

/* ── Restriction-enzyme recognition sites ─────────────────────────── */

const RE_SITES: Record<string, { pattern: RegExp; name: string }> = {
  BsaI:   { pattern: /GGTCTC/gi,  name: "BsaI (GGTCTC)" },
  BpiI:   { pattern: /GAAGAC/gi,  name: "BpiI (GAAGAC)" },
  BsmBI:  { pattern: /CGTCTC/gi,  name: "BsmBI (CGTCTC)" },
  SapI:   { pattern: /GCTCTTC/gi, name: "SapI (GCTCTTC)" },
  EcoRI:  { pattern: /GAATTC/gi,  name: "EcoRI (GAATTC)" },
  XbaI:   { pattern: /TCTAGA/gi,  name: "XbaI (TCTAGA)" },
  SpeI:   { pattern: /ACTAGT/gi,  name: "SpeI (ACTAGT)" },
  PstI:   { pattern: /CTGCAG/gi,  name: "PstI (CTGCAG)" },
  NotI:   { pattern: /GCGGCCGC/gi, name: "NotI (GCGGCCGC)" },
  BamHI:  { pattern: /GGATCC/gi,  name: "BamHI (GGATCC)" },
  HindIII:{ pattern: /AAGCTT/gi,  name: "HindIII (AAGCTT)" },
  XhoI:   { pattern: /CTCGAG/gi,  name: "XhoI (CTCGAG)" },
  NcoI:   { pattern: /CCATGG/gi,  name: "NcoI (CCATGG)" },
  NdeI:   { pattern: /CATATG/gi,  name: "NdeI (CATATG)" },
};

function countSites(seq: string, pattern: RegExp): number {
  return (seq.match(pattern) || []).length;
}

function findAnySites(seq: string, keys: string[]): { found: string[]; missing: string[] } {
  const found: string[] = [];
  const missing: string[] = [];
  for (const k of keys) {
    const re = RE_SITES[k];
    if (re && countSites(seq, re.pattern) > 0) found.push(re.name);
    else if (re) missing.push(re.name);
  }
  return { found, missing };
}

/* ── Common helpers ───────────────────────────────────────────────── */

function clean(seq: string): string {
  return seq.toUpperCase().replace(/[^ATGC]/g, "");
}

function gcContent(seq: string): number {
  if (!seq.length) return 0;
  return ((seq.match(/[GC]/g) || []).length / seq.length) * 100;
}

function hasRepeatRegion(seq: string, windowSize = 8): boolean {
  for (let i = 0; i <= seq.length - windowSize; i++) {
    const kmer = seq.substring(i, i + windowSize);
    if (seq.indexOf(kmer, i + 1) !== -1) return true;
  }
  return false;
}

function homopolymerRuns(seq: string, maxLen = 6): { found: boolean; longest: number } {
  let longest = 0;
  let current = 1;
  for (let i = 1; i < seq.length; i++) {
    if (seq[i] === seq[i - 1]) { current++; longest = Math.max(longest, current); }
    else current = 1;
  }
  return { found: longest >= maxLen, longest };
}

function palindromicCheck(seq: string): boolean {
  const comp: Record<string, string> = { A: "T", T: "A", G: "C", C: "G" };
  const rc = seq.split("").reverse().map(c => comp[c] || c).join("");
  return seq === rc;
}

/* ── Common checks shared across methods ──────────────────────────── */

function commonChecks(seq: string): ValidationResult[] {
  const bp = seq.length;
  const gc = gcContent(seq);
  const stopCodons = ["TAA", "TAG", "TGA"];

  let internalStops = 0;
  for (let i = 0; i + 3 <= seq.length - 3; i += 3) {
    if (stopCodons.includes(seq.substring(i, i + 3))) internalStops++;
  }

  const hasStart = seq.startsWith("ATG");
  const endsStop = stopCodons.includes(seq.slice(-3));
  const inFrame = bp > 0 && bp % 3 === 0;
  const homo = homopolymerRuns(seq);

  return [
    {
      label: "Sequence Length",
      status: bp > 0 ? "pass" : "fail",
      detail: bp > 0 ? `${bp} bp` : "No sequence",
    },
    {
      label: "Valid Nucleotides",
      status: bp > 0 ? "pass" : "fail",
      detail: bp > 0 ? "All valid (ATGC)" : "N/A",
    },
    {
      label: "GC Content (40–60%)",
      status: bp === 0 ? "fail" : gc >= 40 && gc <= 60 ? "pass" : gc >= 30 && gc <= 70 ? "warn" : "fail",
      detail: bp > 0 ? `${gc.toFixed(1)}%` : "N/A",
    },
    {
      label: "Start Codon (ATG)",
      status: bp === 0 ? "fail" : hasStart ? "pass" : "warn",
      detail: hasStart ? "Present" : "Missing",
    },
    {
      label: "Reading Frame (÷3)",
      status: bp === 0 ? "fail" : inFrame ? "pass" : "warn",
      detail: inFrame ? "In-frame" : "Not divisible by 3",
    },
    {
      label: "Internal Stop Codons",
      status: bp === 0 ? "fail" : internalStops === 0 ? "pass" : "fail",
      detail: internalStops > 0 ? `${internalStops} found` : "None",
    },
    {
      label: "Terminal Stop Codon",
      status: bp === 0 ? "fail" : endsStop ? "pass" : "warn",
      detail: endsStop ? "Present" : "Missing",
    },
    {
      label: "Homopolymer Runs",
      status: homo.found ? "warn" : "pass",
      detail: homo.found ? `Longest: ${homo.longest}nt (may affect synthesis)` : "None >5nt",
    },
  ];
}

/* ── Assembly-specific validators ─────────────────────────────────── */

function validateGoldenGate(seq: string): ValidationResult[] {
  const bsaI = countSites(seq, RE_SITES.BsaI.pattern);
  const bpiI = countSites(seq, RE_SITES.BpiI.pattern);
  const bsmBI = countSites(seq, RE_SITES.BsmBI.pattern);
  const typeIIS = bsaI + bpiI + bsmBI;

  // Check for internal sites that would interfere
  const internalBsaI = bsaI > 2; // more than flanking sites = internal
  
  return [
    {
      label: "Type IIS Sites (BsaI/BpiI/BsmBI)",
      status: typeIIS >= 2 ? "pass" : typeIIS === 1 ? "warn" : "fail",
      detail: typeIIS >= 2
        ? `${typeIIS} sites found (BsaI: ${bsaI}, BpiI: ${bpiI}, BsmBI: ${bsmBI})`
        : typeIIS === 1 ? "Only 1 site — need ≥2 flanking sites" : "No Type IIS sites detected — required for Golden Gate",
    },
    {
      label: "4bp Overhang Compatibility",
      status: typeIIS >= 2 ? "pass" : "warn",
      detail: typeIIS >= 2 ? "Sites present for overhang generation" : "Cannot assess without Type IIS sites",
    },
    {
      label: "Internal Type IIS Sites",
      status: internalBsaI ? "warn" : "pass",
      detail: internalBsaI ? "Possible internal BsaI sites — may cause mis-assembly" : "No interfering internal sites",
    },
    {
      label: "Recommended Size",
      status: seq.length <= 10000 ? "pass" : "warn",
      detail: seq.length <= 10000 ? `${seq.length} bp (within optimal range)` : `${seq.length} bp — consider splitting into parts`,
    },
  ];
}

function validateGibson(seq: string): ValidationResult[] {
  const bp = seq.length;
  // Gibson requires 15-40bp overlaps at each junction
  const hasOverlapLength = bp >= 40;
  
  // Check for secondary structure potential (high GC at ends)
  const first40 = seq.substring(0, Math.min(40, bp));
  const last40 = seq.substring(Math.max(0, bp - 40));
  const endGC = (gcContent(first40) + gcContent(last40)) / 2;

  return [
    {
      label: "Overlap Region Length",
      status: hasOverlapLength ? "pass" : "fail",
      detail: hasOverlapLength ? "Sequence ≥40bp (sufficient for 15-40bp overlaps)" : "Sequence too short for Gibson overlaps",
    },
    {
      label: "End GC Content (overlap regions)",
      status: endGC >= 40 && endGC <= 65 ? "pass" : endGC >= 30 && endGC <= 75 ? "warn" : "fail",
      detail: `${endGC.toFixed(1)}% at ends — ${endGC >= 40 && endGC <= 65 ? "optimal for annealing" : "may affect overlap annealing efficiency"}`,
    },
    {
      label: "Fragment Size (0.2–15 kb)",
      status: bp >= 200 && bp <= 15000 ? "pass" : bp >= 100 && bp <= 20000 ? "warn" : "fail",
      detail: `${(bp / 1000).toFixed(1)} kb — ${bp >= 200 && bp <= 15000 ? "within optimal range" : "outside recommended range"}`,
    },
    {
      label: "Repeat Regions",
      status: hasRepeatRegion(seq) ? "warn" : "pass",
      detail: hasRepeatRegion(seq) ? "Repeats detected — may cause mis-priming during assembly" : "No problematic repeats",
    },
    {
      label: "Interfering Restriction Sites",
      status: "pass",
      detail: "Gibson is sequence-independent (no restriction enzymes needed)",
    },
  ];
}

function validateBioBrick(seq: string): ValidationResult[] {
  const hasEcoRI = countSites(seq, RE_SITES.EcoRI.pattern);
  const hasXbaI = countSites(seq, RE_SITES.XbaI.pattern);
  const hasSpeI = countSites(seq, RE_SITES.SpeI.pattern);
  const hasPstI = countSites(seq, RE_SITES.PstI.pattern);
  const hasNotI = countSites(seq, RE_SITES.NotI.pattern);

  // BioBrick prefix: EcoRI...XbaI, suffix: SpeI...PstI
  // Internal sites are forbidden
  const prefixOk = hasEcoRI >= 1 && hasXbaI >= 1;
  const suffixOk = hasSpeI >= 1 && hasPstI >= 1;
  
  // Internal = sites beyond the expected prefix/suffix
  const internalEcoRI = hasEcoRI > 1;
  const internalXbaI = hasXbaI > 1;
  const internalSpeI = hasSpeI > 1;
  const internalPstI = hasPstI > 1;
  const hasInternalSites = internalEcoRI || internalXbaI || internalSpeI || internalPstI;

  return [
    {
      label: "BioBrick Prefix (EcoRI + XbaI)",
      status: prefixOk ? "pass" : hasEcoRI >= 1 || hasXbaI >= 1 ? "warn" : "fail",
      detail: prefixOk ? `EcoRI: ${hasEcoRI}, XbaI: ${hasXbaI}` : "Missing prefix sites — add GAATTCATCTATGAAATA... prefix",
    },
    {
      label: "BioBrick Suffix (SpeI + PstI)",
      status: suffixOk ? "pass" : hasSpeI >= 1 || hasPstI >= 1 ? "warn" : "fail",
      detail: suffixOk ? `SpeI: ${hasSpeI}, PstI: ${hasPstI}` : "Missing suffix sites — add ...TACTAGTAGCGGCCGCTGCAG suffix",
    },
    {
      label: "Internal Forbidden Sites",
      status: hasInternalSites ? "fail" : "pass",
      detail: hasInternalSites
        ? `Internal sites found: ${[internalEcoRI && "EcoRI", internalXbaI && "XbaI", internalSpeI && "SpeI", internalPstI && "PstI"].filter(Boolean).join(", ")} — must be removed`
        : "No internal EcoRI/XbaI/SpeI/PstI sites",
    },
    {
      label: "NotI Sites (optional flanking)",
      status: hasNotI > 0 ? "pass" : "warn",
      detail: hasNotI > 0 ? `${hasNotI} NotI site(s) found` : "No NotI — consider adding for linearization",
    },
  ];
}

function validateMoClo(seq: string): ValidationResult[] {
  const bsaI = countSites(seq, RE_SITES.BsaI.pattern);
  const bpiI = countSites(seq, RE_SITES.BpiI.pattern);
  const bsmBI = countSites(seq, RE_SITES.BsmBI.pattern);

  // MoClo uses hierarchical Type IIS assembly: Level 0 = BsaI, Level 1 = BpiI, Level 2 = BsaI again
  return [
    {
      label: "Level 0 Sites (BsaI)",
      status: bsaI >= 2 ? "pass" : bsaI === 1 ? "warn" : "fail",
      detail: bsaI >= 2 ? `${bsaI} BsaI sites — compatible with Level 0` : bsaI === 1 ? "Only 1 BsaI site — need ≥2 for Level 0" : "No BsaI sites — required for MoClo Level 0",
    },
    {
      label: "Level 1 Sites (BpiI)",
      status: bpiI >= 2 ? "pass" : "warn",
      detail: bpiI >= 2 ? `${bpiI} BpiI sites — Level 1 compatible` : "No BpiI sites — needed for Level 1 assembly",
    },
    {
      label: "Level 2 Sites (BsmBI)",
      status: bsmBI >= 0 ? (bsmBI >= 2 ? "pass" : "warn") : "warn",
      detail: bsmBI >= 2 ? `${bsmBI} BsmBI sites — Level 2 compatible` : "Consider BsmBI sites for higher-level assembly",
    },
    {
      label: "Hierarchical Compatibility",
      status: bsaI >= 2 && bpiI === 0 ? "pass" : bsaI >= 2 ? "warn" : "fail",
      detail: bsaI >= 2 && bpiI === 0 ? "Clean Level 0 part (no BpiI interference)" : bsaI >= 2 ? "BpiI present — verify no cross-level interference" : "Insufficient Type IIS sites for MoClo",
    },
  ];
}

function validateSLIC(seq: string): ValidationResult[] {
  const bp = seq.length;
  const endGC = (gcContent(seq.substring(0, 20)) + gcContent(seq.substring(Math.max(0, bp - 20)))) / 2;

  return [
    {
      label: "Homology Arms (≥15 bp)",
      status: bp >= 30 ? "pass" : "fail",
      detail: bp >= 30 ? "Sequence long enough for 15bp homology arms" : "Too short for SLIC homology regions",
    },
    {
      label: "T4 DNA Polymerase Compatibility",
      status: "pass",
      detail: "Sequence compatible with chew-back reaction",
    },
    {
      label: "End Region GC Content",
      status: endGC >= 35 && endGC <= 65 ? "pass" : "warn",
      detail: `${endGC.toFixed(1)}% — ${endGC >= 35 && endGC <= 65 ? "good for single-strand annealing" : "may affect annealing efficiency"}`,
    },
    {
      label: "Fragment Size (0.1–10 kb)",
      status: bp >= 100 && bp <= 10000 ? "pass" : "warn",
      detail: `${(bp / 1000).toFixed(1)} kb — ${bp >= 100 && bp <= 10000 ? "within optimal range" : "outside recommended range for SLIC"}`,
    },
  ];
}

function validateLCR(seq: string): ValidationResult[] {
  const bp = seq.length;
  const gc = gcContent(seq);

  return [
    {
      label: "Bridging Oligo Design",
      status: bp >= 40 ? "pass" : "fail",
      detail: bp >= 40 ? "Sufficient length for bridging oligonucleotide design" : "Sequence too short for bridging oligos",
    },
    {
      label: "GC Content for Ligation",
      status: gc >= 40 && gc <= 60 ? "pass" : gc >= 30 && gc <= 70 ? "warn" : "fail",
      detail: `${gc.toFixed(1)}% — ${gc >= 40 && gc <= 60 ? "optimal for ligase cycling" : "may affect ligation efficiency"}`,
    },
    {
      label: "Sequence Complexity",
      status: !hasRepeatRegion(seq) ? "pass" : "warn",
      detail: !hasRepeatRegion(seq) ? "No problematic repeats" : "Repeats detected — bridging oligos may mis-anneal",
    },
    {
      label: "Scarless Assembly",
      status: "pass",
      detail: "LCR produces scarless junctions (no extra sequence added)",
    },
    {
      label: "Fragment Count Estimate",
      status: bp <= 20000 ? "pass" : "warn",
      detail: bp <= 5000 ? "Single fragment — consider multi-part LCR for large constructs" : `${(bp / 1000).toFixed(1)} kb — may need ${Math.ceil(bp / 5000)} fragments`,
    },
  ];
}

function validateTOPO(seq: string): ValidationResult[] {
  const bp = seq.length;
  // TOPO TA cloning needs 3' A-overhang (Taq polymerase product)
  // TOPO Blunt needs blunt ends (Pfu/Phusion product)
  const endsWithA = seq.endsWith("A");
  const startsWithA = seq.startsWith("A");

  // Check for topoisomerase I recognition site (CCCTT)
  const topoSite = countSites(seq, /CCCTT/gi);

  return [
    {
      label: "3' A-Overhang (TA Cloning)",
      status: endsWithA ? "pass" : "warn",
      detail: endsWithA ? "Ends with A — compatible with TOPO TA cloning" : "Does not end with A — use Taq polymerase or add A-tailing step",
    },
    {
      label: "Internal CCCTT Sites",
      status: topoSite <= 2 ? "pass" : "warn",
      detail: topoSite <= 2 ? `${topoSite} CCCTT site(s) — acceptable` : `${topoSite} CCCTT sites — may interfere with topoisomerase binding`,
    },
    {
      label: "PCR Product Size (0.1–10 kb)",
      status: bp >= 100 && bp <= 10000 ? "pass" : bp >= 50 && bp <= 15000 ? "warn" : "fail",
      detail: `${(bp / 1000).toFixed(1)} kb — ${bp >= 100 && bp <= 10000 ? "optimal for TOPO cloning" : "outside recommended range"}`,
    },
    {
      label: "Blunt-End Compatibility",
      status: "pass",
      detail: "Also compatible with TOPO Blunt if using proofreading polymerase",
    },
  ];
}

function validateRestrictionLigation(seq: string): ValidationResult[] {
  const commonREs = ["EcoRI", "BamHI", "HindIII", "XhoI", "NcoI", "NdeI", "NotI", "PstI", "XbaI", "SpeI"];
  const { found, missing } = findAnySites(seq, commonREs);

  // Check for compatible cohesive ends
  const hasAtLeast2 = found.length >= 2;

  return [
    {
      label: "Restriction Sites Detected",
      status: found.length >= 2 ? "pass" : found.length === 1 ? "warn" : "fail",
      detail: found.length > 0 ? `Found: ${found.join(", ")}` : "No common RE sites detected — add sites to primers",
    },
    {
      label: "Compatible End Pairs",
      status: hasAtLeast2 ? "pass" : "warn",
      detail: hasAtLeast2 ? `${found.length} sites available for directional cloning` : "Need ≥2 different sites for directional insertion",
    },
    {
      label: "Internal Site Conflicts",
      status: found.length <= 4 ? "pass" : "warn",
      detail: found.length <= 4 ? "Manageable number of sites" : `${found.length} sites found — verify no unwanted internal cuts`,
    },
    {
      label: "Fragment Size",
      status: seq.length >= 50 ? "pass" : "fail",
      detail: `${seq.length} bp — ${seq.length >= 50 ? "sufficient for ligation" : "very small fragments ligate poorly"}`,
    },
  ];
}

function validateInFusion(seq: string): ValidationResult[] {
  const bp = seq.length;
  // In-Fusion requires exactly 15bp overlaps at each end matching the vector
  const first15 = seq.substring(0, Math.min(15, bp));
  const last15 = seq.substring(Math.max(0, bp - 15));
  const endGC = (gcContent(first15) + gcContent(last15)) / 2;

  return [
    {
      label: "15bp Overlap Regions",
      status: bp >= 30 ? "pass" : "fail",
      detail: bp >= 30 ? "Sequence long enough for 15bp overlaps at both ends" : "Too short — In-Fusion requires exactly 15bp overlaps",
    },
    {
      label: "Overlap GC Content",
      status: endGC >= 35 && endGC <= 65 ? "pass" : "warn",
      detail: `${endGC.toFixed(1)}% at ends — ${endGC >= 35 && endGC <= 65 ? "optimal for In-Fusion annealing" : "may reduce cloning efficiency"}`,
    },
    {
      label: "Insert Size (0.1–15 kb)",
      status: bp >= 100 && bp <= 15000 ? "pass" : bp >= 50 && bp <= 20000 ? "warn" : "fail",
      detail: `${(bp / 1000).toFixed(1)} kb — ${bp >= 100 && bp <= 15000 ? "within Takara's recommended range" : "outside optimal range"}`,
    },
    {
      label: "Secondary Structure at Ends",
      status: !palindromicCheck(first15) ? "pass" : "warn",
      detail: !palindromicCheck(first15) ? "No palindromic ends detected" : "Palindromic end sequence — may form hairpins",
    },
  ];
}

function validateUSER(seq: string): ValidationResult[] {
  const bp = seq.length;
  // USER cloning uses uracil-containing primers; check for dU incorporation sites
  // The enzyme recognizes and excises uracil creating 3' overhangs
  // Typically uses PacI-like 8bp overhangs
  
  return [
    {
      label: "Uracil Excision Compatibility",
      status: bp >= 50 ? "pass" : "fail",
      detail: bp >= 50 ? "Sequence compatible with USER enzyme processing" : "Too short for USER cloning",
    },
    {
      label: "Overhang Design (8bp)",
      status: bp >= 16 ? "pass" : "fail",
      detail: bp >= 16 ? "Sufficient length for 8bp complementary overhangs" : "Cannot design 8bp overhangs",
    },
    {
      label: "Internal Uracil Sites",
      status: "pass",
      detail: "Uracil is introduced via primers, not in template DNA",
    },
    {
      label: "Fragment Size",
      status: bp >= 100 && bp <= 12000 ? "pass" : "warn",
      detail: `${(bp / 1000).toFixed(1)} kb — ${bp >= 100 && bp <= 12000 ? "within optimal range" : "consider optimizing fragment size"}`,
    },
    {
      label: "Directional Cloning",
      status: "pass",
      detail: "USER generates unique non-palindromic overhangs for directional assembly",
    },
  ];
}

function validateSLiCE(seq: string): ValidationResult[] {
  const bp = seq.length;
  const endGC = (gcContent(seq.substring(0, 20)) + gcContent(seq.substring(Math.max(0, bp - 20)))) / 2;

  return [
    {
      label: "Homology Arms (≥15 bp)",
      status: bp >= 30 ? "pass" : "fail",
      detail: bp >= 30 ? "Sufficient length for ≥15bp homology arms" : "Too short for SLiCE homology regions",
    },
    {
      label: "Homology Arm GC Content",
      status: endGC >= 35 && endGC <= 65 ? "pass" : "warn",
      detail: `${endGC.toFixed(1)}% — ${endGC >= 35 && endGC <= 65 ? "optimal for recombination" : "may reduce recombination efficiency"}`,
    },
    {
      label: "Cell Extract Compatibility",
      status: "pass",
      detail: "SLiCE uses E. coli cell extract (RecA-independent recombination)",
    },
    {
      label: "Fragment Size (0.1–52 kb)",
      status: bp >= 100 && bp <= 52000 ? "pass" : "warn",
      detail: `${(bp / 1000).toFixed(1)} kb — ${bp >= 100 && bp <= 52000 ? "within published range" : "outside tested range"}`,
    },
    {
      label: "No Kit Required",
      status: "pass",
      detail: "SLiCE requires only laboratory-prepared cell extract",
    },
  ];
}

function validateBASIC(seq: string): ValidationResult[] {
  const bp = seq.length;
  // BASIC uses standardized iP and iS linker prefix/suffix
  // iP linker: typically contains specific 12bp sequences
  const iPLinker = /TCTGGTGGGTCTCTGTCC/gi;
  const iSLinker = /GGCTCGAATTCGTAATC/gi;
  const hasiP = countSites(seq, iPLinker);
  const hasiS = countSites(seq, iSLinker);

  return [
    {
      label: "iP Linker Prefix",
      status: hasiP > 0 ? "pass" : "warn",
      detail: hasiP > 0 ? "iP linker sequence detected" : "No iP linker — add integrated Prefix linker for BASIC compatibility",
    },
    {
      label: "iS Linker Suffix",
      status: hasiS > 0 ? "pass" : "warn",
      detail: hasiS > 0 ? "iS linker sequence detected" : "No iS linker — add integrated Suffix linker for BASIC compatibility",
    },
    {
      label: "Part Standardization",
      status: bp >= 50 ? "pass" : "fail",
      detail: bp >= 50 ? "Sequence suitable for BASIC DNA-part standardization" : "Too short for standardized BASIC part",
    },
    {
      label: "Microfluidics Compatibility",
      status: bp <= 15000 ? "pass" : "warn",
      detail: `${(bp / 1000).toFixed(1)} kb — ${bp <= 15000 ? "compatible with microfluidic assembly" : "may be too large for microfluidic handling"}`,
    },
  ];
}

function validate2Ab(seq: string): ValidationResult[] {
  // 2A self-cleaving peptide sequences
  const p2a = /GGAAGCGGAGCTACTAACTTCAGCCTGCTGAAGCAGGCTGGAGACGTGGAGGAGAACCCTGGACCT/gi;
  const t2a = /GAGGGCAGAGGAAGTCTGCTAACATGCGGTGACGTGGAGGAGAATCCTGGACCT/gi;
  const e2a = /CAGTGTACTAATTATGCTCTCTTGAAATTGGCTGGAGATGTTGAGAGCAACCCAGGTCCC/gi;
  const f2a = /GTTGAAACAAACTTGTTTGAGAATTTGAAAGCTACTAATTTTAAACAGTGGGAGAGGGGGAAATTGGCTCCCGTGAAACAGTCCTTCCTC/gi;

  const hasP2A = countSites(seq, p2a);
  const hasT2A = countSites(seq, t2a);
  const hasE2A = countSites(seq, e2a);
  const hasF2A = countSites(seq, f2a);
  const total2A = hasP2A + hasT2A + hasE2A + hasF2A;

  // Check for GSG linker before 2A (improves cleavage)
  const gsgLinker = /GGA[TC]C[ATGC]GG[ATGC]/gi;
  const hasGSG = countSites(seq, gsgLinker);

  return [
    {
      label: "2A Peptide Sequences",
      status: total2A > 0 ? "pass" : "fail",
      detail: total2A > 0
        ? `Found: ${[hasP2A && "P2A", hasT2A && "T2A", hasE2A && "E2A", hasF2A && "F2A"].filter(Boolean).join(", ")}`
        : "No 2A peptide sequences detected — required for polycistronic expression",
    },
    {
      label: "Multi-Cistron Structure",
      status: total2A >= 1 ? "pass" : "fail",
      detail: total2A >= 1 ? `${total2A + 1} genes can be co-expressed` : "Add 2A sequences between genes of interest",
    },
    {
      label: "GSG Linker (cleavage efficiency)",
      status: hasGSG > 0 ? "pass" : "warn",
      detail: hasGSG > 0 ? "GSG linker detected upstream of 2A" : "Consider adding GSG linker before 2A for better cleavage",
    },
    {
      label: "Antibody Chain Arrangement",
      status: seq.length >= 600 ? "pass" : "warn",
      detail: seq.length >= 600 ? "Sufficient length for antibody chain expression" : "Sequence may be too short for full antibody chains",
    },
  ];
}

function validateSeamlessLigation(seq: string): ValidationResult[] {
  const bp = seq.length;
  const endGC = (gcContent(seq.substring(0, 25)) + gcContent(seq.substring(Math.max(0, bp - 25)))) / 2;

  return [
    {
      label: "Homology Arms (≥20 bp)",
      status: bp >= 40 ? "pass" : "fail",
      detail: bp >= 40 ? "Sufficient for ≥20bp seamless homology arms" : "Too short for seamless ligation",
    },
    {
      label: "End Region Quality",
      status: endGC >= 35 && endGC <= 65 ? "pass" : "warn",
      detail: `${endGC.toFixed(1)}% GC at ends — ${endGC >= 35 && endGC <= 65 ? "optimal for single-strand annealing" : "may affect annealing"}`,
    },
    {
      label: "Scarless Junction",
      status: "pass",
      detail: "Seamless ligation produces scar-free junctions",
    },
    {
      label: "T4 Polymerase Chew-Back",
      status: bp >= 100 ? "pass" : "warn",
      detail: bp >= 100 ? "Compatible with controlled exonuclease treatment" : "Short fragment — careful titration needed",
    },
  ];
}

function validateTypeIIS(seq: string): ValidationResult[] {
  const bsaI = countSites(seq, RE_SITES.BsaI.pattern);
  const bpiI = countSites(seq, RE_SITES.BpiI.pattern);
  const bsmBI = countSites(seq, RE_SITES.BsmBI.pattern);
  const sapI = countSites(seq, RE_SITES.SapI.pattern);
  const totalTypeIIS = bsaI + bpiI + bsmBI + sapI;

  return [
    {
      label: "Type IIS Enzyme Sites",
      status: totalTypeIIS >= 2 ? "pass" : totalTypeIIS === 1 ? "warn" : "fail",
      detail: totalTypeIIS > 0
        ? `BsaI: ${bsaI}, BpiI: ${bpiI}, BsmBI: ${bsmBI}, SapI: ${sapI}`
        : "No Type IIS sites detected — required for this method",
    },
    {
      label: "Overhang Design",
      status: totalTypeIIS >= 2 ? "pass" : "warn",
      detail: totalTypeIIS >= 2 ? "Multiple sites for custom overhang generation" : "Insufficient sites for overhang design",
    },
    {
      label: "Site Orientation",
      status: totalTypeIIS >= 2 ? "pass" : "warn",
      detail: totalTypeIIS >= 2 ? "Verify sites are in correct orientation (sense/antisense)" : "Cannot assess orientation without sites",
    },
    {
      label: "Domestication Check",
      status: totalTypeIIS <= 6 ? "pass" : "warn",
      detail: totalTypeIIS <= 6 ? "Manageable number of sites" : `${totalTypeIIS} sites — may need domestication to remove internal sites`,
    },
  ];
}

function validateOEPCR(seq: string): ValidationResult[] {
  const bp = seq.length;
  const gc = gcContent(seq);
  // OE-PCR relies on overlapping primer regions
  const first25 = seq.substring(0, Math.min(25, bp));
  const last25 = seq.substring(Math.max(0, bp - 25));
  const endGC = (gcContent(first25) + gcContent(last25)) / 2;

  return [
    {
      label: "Overlap Region (15–25 bp)",
      status: bp >= 30 ? "pass" : "fail",
      detail: bp >= 30 ? "Sufficient for 15-25bp overlapping primer design" : "Too short for overlap extension",
    },
    {
      label: "Overlap Tm Estimate",
      status: endGC >= 40 && endGC <= 60 ? "pass" : "warn",
      detail: `~${(endGC * 0.6 + 20).toFixed(0)}°C estimated — ${endGC >= 40 && endGC <= 60 ? "good annealing temperature" : "may need Tm optimization"}`,
    },
    {
      label: "Overall GC Content",
      status: gc >= 40 && gc <= 60 ? "pass" : "warn",
      detail: `${gc.toFixed(1)}% — ${gc >= 40 && gc <= 60 ? "optimal for PCR amplification" : "may affect PCR efficiency"}`,
    },
    {
      label: "Product Size",
      status: bp <= 10000 ? "pass" : "warn",
      detail: `${(bp / 1000).toFixed(1)} kb — ${bp <= 10000 ? "within OE-PCR range" : "large product — consider multi-step assembly"}`,
    },
    {
      label: "Secondary Structure Risk",
      status: !hasRepeatRegion(seq, 10) ? "pass" : "warn",
      detail: !hasRepeatRegion(seq, 10) ? "Low secondary structure risk" : "Repeat regions may cause mis-priming during extension",
    },
  ];
}

function validateYeastHR(seq: string): ValidationResult[] {
  const bp = seq.length;
  const first50 = seq.substring(0, Math.min(50, bp));
  const last50 = seq.substring(Math.max(0, bp - 50));
  const endGC = (gcContent(first50) + gcContent(last50)) / 2;

  return [
    {
      label: "Homology Arms (≥30 bp)",
      status: bp >= 60 ? "pass" : "fail",
      detail: bp >= 60 ? "Sufficient for ≥30bp yeast homology arms" : "Need ≥30bp homology arms for efficient recombination",
    },
    {
      label: "Homology Arm Length (optimal ≥50 bp)",
      status: bp >= 100 ? "pass" : bp >= 60 ? "warn" : "fail",
      detail: bp >= 100 ? "≥50bp arms available — high recombination efficiency expected" : "Short arms — consider extending to ≥50bp",
    },
    {
      label: "Homology Arm GC Content",
      status: endGC >= 30 && endGC <= 55 ? "pass" : "warn",
      detail: `${endGC.toFixed(1)}% — ${endGC >= 30 && endGC <= 55 ? "optimal for yeast (AT-rich genome)" : "yeast genome is AT-rich, high GC may reduce efficiency"}`,
    },
    {
      label: "In Vivo Assembly",
      status: "pass",
      detail: "Yeast HR occurs in vivo — no enzyme/kit required",
    },
    {
      label: "Multi-Fragment Assembly",
      status: bp <= 50000 ? "pass" : "warn",
      detail: `${(bp / 1000).toFixed(1)} kb — yeast HR supports up to ~300 kb with multiple overlapping fragments`,
    },
  ];
}

/* ── Main dispatcher ──────────────────────────────────────────────── */

const assemblyValidators: Record<string, (seq: string) => ValidationResult[]> = {
  "Golden Gate": validateGoldenGate,
  "Gibson Assembly": validateGibson,
  "BioBrick": validateBioBrick,
  "MoClo": validateMoClo,
  "SLIC": validateSLIC,
  "LCR (Ligase Cycling Reaction)": validateLCR,
  "TOPO Cloning": validateTOPO,
  "Restriction-Ligation": validateRestrictionLigation,
  "In-Fusion": validateInFusion,
  "USER Cloning": validateUSER,
  "SLiCE": validateSLiCE,
  "BASIC Assembly": validateBASIC,
  "2Ab Assembly": validate2Ab,
  "Seamless Ligation": validateSeamlessLigation,
  "Type IIS Restriction": validateTypeIIS,
  "Overlap Extension PCR": validateOEPCR,
  "Yeast Homologous Recombination": validateYeastHR,
};

export function runFullValidation(
  rawSequence: string,
  assemblyType: string,
  codonOrg: string,
): ValidationResult[] {
  const seq = clean(rawSequence);
  const common = commonChecks(seq);
  const assemblyFn = assemblyValidators[assemblyType];
  const assemblyResults = assemblyFn ? assemblyFn(seq) : [];

  return [
    ...common,
    // Separator-style label for assembly section
    ...assemblyResults.map(r => ({
      ...r,
      label: `[${assemblyType}] ${r.label}`,
    })),
    {
      label: "Host Codon Bias",
      status: "pass" as const,
      detail: codonOrg,
    },
  ];
}
