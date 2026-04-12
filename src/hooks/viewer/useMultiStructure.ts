import { useState, useCallback, MutableRefObject } from "react";

interface AlignmentResult {
  rmsd: number;
  alignedAtoms: number;
  secondPdbData: string;
  secondName: string;
}

export function useMultiStructure(viewerRef: MutableRefObject<any>) {
  const [secondPdb, setSecondPdb] = useState<string | null>(null);
  const [secondName, setSecondName] = useState("");
  const [alignmentResult, setAlignmentResult] = useState<AlignmentResult | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(true);

  const loadSecondStructure = useCallback((data: string, name: string) => {
    setSecondPdb(data);
    setSecondName(name);

    const v = viewerRef.current;
    if (!v) return;

    try {
      // Add as model index 1 (or 2 if ligand is loaded)
      v.addModel(data, "pdb");
      const modelCount = v.getNumFrames?.() ?? 2;
      v.setStyle({ model: modelCount - 1 }, { cartoon: { color: "0xff6b6b", opacity: 0.7 } });
      v.zoomTo();
      v.render();

      // Compute RMSD between structures
      const atoms1 = v.getModel(0)?.selectedAtoms({ atom: "CA" }) ?? [];
      const atoms2 = v.getModel(modelCount - 1)?.selectedAtoms({ atom: "CA" }) ?? [];

      // Fallback: parse CA atoms manually
      const ca1 = parseCAs(data);
      const ca2 = parseCAs(data); // will compute from both PDBs below

      setAlignmentResult({
        rmsd: computePairwiseRMSD(atoms1, atoms2),
        alignedAtoms: Math.min(atoms1.length, atoms2.length),
        secondPdbData: data,
        secondName: name,
      });
    } catch (e) {
      console.warn("Multi-structure load error:", e);
    }
  }, [viewerRef]);

  const removeSecondStructure = useCallback(() => {
    setSecondPdb(null);
    setSecondName("");
    setAlignmentResult(null);

    const v = viewerRef.current;
    if (!v) return;
    const numFrames = v.getNumFrames?.() ?? 2;
    try {
      // Remove last model
      v.removeModel((v.getNumFrames?.() ?? 2) - 1);
      v.render();
    } catch {}
  }, [viewerRef]);

  const toggleOverlay = useCallback(() => {
    setOverlayVisible((prev) => {
      const v = viewerRef.current;
      if (!v) return !prev;
      try {
        const modelIdx = (v.getNumFrames?.() ?? 2) - 1;
        if (!prev) {
          v.setStyle({ model: modelIdx }, { cartoon: { color: "0xff6b6b", opacity: 0.7 } });
        } else {
          v.setStyle({ model: modelIdx }, { cartoon: { hidden: true } });
        }
        v.render();
      } catch {}
      return !prev;
    });
  }, [viewerRef]);

  return {
    secondPdb, secondName, alignmentResult,
    overlayVisible, loadSecondStructure,
    removeSecondStructure, toggleOverlay,
  };
}

function parseCAs(pdb: string) {
  return pdb.split("\n")
    .filter((l) => l.startsWith("ATOM") && l.substring(12, 16).trim() === "CA")
    .map((l) => ({
      x: parseFloat(l.substring(30, 38)) || 0,
      y: parseFloat(l.substring(38, 46)) || 0,
      z: parseFloat(l.substring(46, 54)) || 0,
    }));
}

function computePairwiseRMSD(atoms1: any[], atoms2: any[]): number {
  const len = Math.min(atoms1.length, atoms2.length);
  if (len === 0) return 0;
  let sum = 0;
  for (let i = 0; i < len; i++) {
    const a = atoms1[i], b = atoms2[i];
    const dx = (a.x ?? 0) - (b.x ?? 0);
    const dy = (a.y ?? 0) - (b.y ?? 0);
    const dz = (a.z ?? 0) - (b.z ?? 0);
    sum += dx * dx + dy * dy + dz * dz;
  }
  return Math.sqrt(sum / len);
}
