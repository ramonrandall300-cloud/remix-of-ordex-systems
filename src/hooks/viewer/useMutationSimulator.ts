import { useState, useCallback } from "react";

interface MutationResult {
  original: { resName: string; resNum: number; chain: string };
  mutated: string;
  deltaSASA: number;
  stabilityDelta: number;
  stabilityLabel: string;
}

// Hydrophobicity scale (Kyte-Doolittle) for stability heuristic
const HYDRO: Record<string, number> = {
  ALA: 1.8, ARG: -4.5, ASN: -3.5, ASP: -3.5, CYS: 2.5,
  GLN: -3.5, GLU: -3.5, GLY: -0.4, HIS: -3.2, ILE: 4.5,
  LEU: 3.8, LYS: -3.9, MET: 1.9, PHE: 2.8, PRO: -1.6,
  SER: -0.8, THR: -0.7, TRP: -0.9, TYR: -1.3, VAL: 4.2,
};

// Approximate residue surface areas (Å²)
const RESIDUE_SASA: Record<string, number> = {
  ALA: 113, ARG: 241, ASN: 158, ASP: 151, CYS: 140,
  GLN: 189, GLU: 183, GLY: 85, HIS: 194, ILE: 182,
  LEU: 180, LYS: 211, MET: 204, PHE: 218, PRO: 143,
  SER: 122, THR: 146, TRP: 259, TYR: 229, VAL: 160,
};

const AMINO_ACIDS = Object.keys(HYDRO);

export function useMutationSimulator(pdbData: string | null) {
  const [selectedResidue, setSelectedResidue] = useState<{
    resName: string; resNum: number; chain: string;
  } | null>(null);
  const [targetResidue, setTargetResidue] = useState("ALA");
  const [mutationResult, setMutationResult] = useState<MutationResult | null>(null);
  const [mutationHistory, setMutationHistory] = useState<MutationResult[]>([]);

  const selectResidue = useCallback((resName: string, resNum: number, chain: string) => {
    setSelectedResidue({ resName, resNum, chain });
    setMutationResult(null);
  }, []);

  const simulateMutation = useCallback(() => {
    if (!selectedResidue || !pdbData) return;

    const { resName, resNum, chain } = selectedResidue;
    const origSASA = RESIDUE_SASA[resName] ?? 150;
    const newSASA = RESIDUE_SASA[targetResidue] ?? 150;
    const deltaSASA = newSASA - origSASA;

    const origHydro = HYDRO[resName] ?? 0;
    const newHydro = HYDRO[targetResidue] ?? 0;
    const hydroDelta = newHydro - origHydro;

    // Heuristic stability: large hydrophobicity changes on surface = destabilizing
    // Buried residues: non-conservative changes destabilize
    let stabilityDelta = -Math.abs(hydroDelta) * 0.3; // general penalty
    if (Math.abs(deltaSASA) > 50) stabilityDelta -= 0.5; // size mismatch
    if (resName === targetResidue) stabilityDelta = 0; // no change

    const stabilityLabel = stabilityDelta > -0.3
      ? "Neutral"
      : stabilityDelta > -1.0
        ? "Mildly destabilizing"
        : "Destabilizing";

    const result: MutationResult = {
      original: selectedResidue,
      mutated: targetResidue,
      deltaSASA: Math.round(deltaSASA * 10) / 10,
      stabilityDelta: Math.round(stabilityDelta * 100) / 100,
      stabilityLabel,
    };

    setMutationResult(result);
    setMutationHistory((prev) => [result, ...prev].slice(0, 10));
  }, [selectedResidue, targetResidue, pdbData]);

  return {
    selectedResidue, selectResidue,
    targetResidue, setTargetResidue,
    mutationResult, mutationHistory,
    simulateMutation,
    aminoAcids: AMINO_ACIDS,
  };
}
