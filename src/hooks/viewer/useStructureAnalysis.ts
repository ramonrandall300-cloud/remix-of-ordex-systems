import { useState, useCallback } from "react";
import { toast } from "sonner";

/* ── PDB Parser ── */
interface PDBAtom {
  serial: number; name: string; resName: string; chain: string;
  resSeq: number; x: number; y: number; z: number; bfactor: number;
}

function parsePDBAtoms(pdb: string): PDBAtom[] {
  const atoms: PDBAtom[] = [];
  for (const l of pdb.split("\n")) {
    if (l.startsWith("ATOM") || l.startsWith("HETATM")) {
      atoms.push({
        serial: parseInt(l.substring(6, 11).trim()) || 0,
        name: l.substring(12, 16).trim(),
        resName: l.substring(17, 20).trim(),
        chain: l.substring(21, 22).trim(),
        resSeq: parseInt(l.substring(22, 26).trim()) || 0,
        x: parseFloat(l.substring(30, 38).trim()) || 0,
        y: parseFloat(l.substring(38, 46).trim()) || 0,
        z: parseFloat(l.substring(46, 54).trim()) || 0,
        bfactor: parseFloat(l.substring(60, 66).trim()) || 0,
      });
    }
  }
  return atoms;
}

/* ── RMSD ── */
function calculateRMSD(pdb: string): { value: number; pairs: number } {
  const atoms = parsePDBAtoms(pdb);
  const caAtoms = atoms.filter((a) => a.name === "CA");
  if (caAtoms.length < 2) return { value: 0, pairs: 0 };
  const chains = new Map<string, PDBAtom[]>();
  caAtoms.forEach((a) => { if (!chains.has(a.chain)) chains.set(a.chain, []); chains.get(a.chain)!.push(a); });
  const keys = Array.from(chains.keys());
  if (keys.length >= 2) {
    const c1 = chains.get(keys[0])!, c2 = chains.get(keys[1])!;
    const len = Math.min(c1.length, c2.length);
    let sum = 0;
    for (let i = 0; i < len; i++) { const dx = c1[i].x - c2[i].x, dy = c1[i].y - c2[i].y, dz = c1[i].z - c2[i].z; sum += dx * dx + dy * dy + dz * dz; }
    return { value: Math.sqrt(sum / len), pairs: len };
  }
  let cx = 0, cy = 0, cz = 0;
  caAtoms.forEach((a) => { cx += a.x; cy += a.y; cz += a.z; });
  cx /= caAtoms.length; cy /= caAtoms.length; cz /= caAtoms.length;
  let sumSq = 0;
  caAtoms.forEach((a) => { const dx = a.x - cx, dy = a.y - cy, dz = a.z - cz; sumSq += dx * dx + dy * dy + dz * dz; });
  return { value: Math.sqrt(sumSq / caAtoms.length), pairs: caAtoms.length };
}

/* ── SASA ── */
function calculateSASA(pdb: string): { total: number; perResidue: { name: string; area: number }[] } {
  const atoms = parsePDBAtoms(pdb);
  const VDW: Record<string, number> = { C: 1.7, N: 1.55, O: 1.52, S: 1.8 };
  const probeR = 1.4;
  const residueArea = new Map<string, number>();
  for (let i = 0; i < atoms.length; i++) {
    const a = atoms[i];
    const r = (VDW[a.name.charAt(0)] || 1.7) + probeR;
    let neighbors = 0;
    for (let j = 0; j < atoms.length; j++) {
      if (i === j) continue;
      const b = atoms[j];
      const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 4.5) neighbors++;
    }
    const exposure = Math.max(0, 1 - neighbors / 26);
    const atomArea = 4 * Math.PI * r * r * exposure;
    const resKey = a.chain + "-" + a.resName + a.resSeq;
    residueArea.set(resKey, (residueArea.get(resKey) || 0) + atomArea);
  }
  let total = 0;
  const perResidue: { name: string; area: number }[] = [];
  residueArea.forEach((area, key) => { total += area; perResidue.push({ name: key, area: Math.round(area * 10) / 10 }); });
  perResidue.sort((a, b) => b.area - a.area);
  return { total: Math.round(total * 10) / 10, perResidue: perResidue.slice(0, 20) };
}

/* ── Contact Map ── */
function computeContactMap(pdb: string): { matrix: number[][]; labels: string[] } {
  const atoms = parsePDBAtoms(pdb);
  const subset = atoms.filter((a) => a.name === "CA").slice(0, 80);
  const labels = subset.map((a) => a.resName + a.resSeq);
  const matrix: number[][] = [];
  for (let i = 0; i < subset.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < subset.length; j++) {
      const dx = subset[i].x - subset[j].x, dy = subset[i].y - subset[j].y, dz = subset[i].z - subset[j].z;
      row.push(Math.sqrt(dx * dx + dy * dy + dz * dz));
    }
    matrix.push(row);
  }
  return { matrix, labels };
}

/* ── Hook ── */
export function useStructureAnalysis(pdbData: string | null) {
  const [analysisLoading, setAnalysisLoading] = useState<string | null>(null);
  const [rmsdResult, setRmsdResult] = useState<{ value: number; pairs: number } | null>(null);
  const [sasaResult, setSasaResult] = useState<{ total: number; perResidue: { name: string; area: number }[] } | null>(null);
  const [contactMap, setContactMap] = useState<{ matrix: number[][]; labels: string[] } | null>(null);

  const runRMSD = useCallback(() => {
    if (!pdbData) return;
    setAnalysisLoading("rmsd");
    setTimeout(() => {
      try { setRmsdResult(calculateRMSD(pdbData)); toast.success("RMSD calculated"); }
      catch { toast.error("Failed to calculate RMSD"); }
      setAnalysisLoading(null);
    }, 50);
  }, [pdbData]);

  const runSASA = useCallback(() => {
    if (!pdbData) return;
    setAnalysisLoading("sasa");
    setTimeout(() => {
      try { setSasaResult(calculateSASA(pdbData)); toast.success("Surface area calculated"); }
      catch { toast.error("Failed to calculate surface area"); }
      setAnalysisLoading(null);
    }, 50);
  }, [pdbData]);

  const runContactMap = useCallback(() => {
    if (!pdbData) return;
    setAnalysisLoading("contact");
    setTimeout(() => {
      try { setContactMap(computeContactMap(pdbData)); toast.success("Contact map generated"); }
      catch { toast.error("Failed to generate contact map"); }
      setAnalysisLoading(null);
    }, 50);
  }, [pdbData]);

  return { analysisLoading, rmsdResult, sasaResult, contactMap, runRMSD, runSASA, runContactMap };
}
