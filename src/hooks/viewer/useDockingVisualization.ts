import { useState, useCallback, useEffect, MutableRefObject } from "react";

export type DockingViewMode = "both" | "protein" | "ligand";

interface DockingPose {
  score: number;
  rmsd: number;
  interactions: any[];
}

export interface DockingVisualizationState {
  viewMode: DockingViewMode;
  showHBonds: boolean;
  showDistances: boolean;
  showBindingEnergy: boolean;
  selectedPose: number;
  poses: DockingPose[];
  bestScore: number | null;
  ligandSdf: string | null;
}

export function useDockingVisualization(
  viewerRef: MutableRefObject<any>,
  pdbData: string | null,
) {
  const [viewMode, setViewMode] = useState<DockingViewMode>("both");
  const [showHBonds, setShowHBonds] = useState(true);
  const [showDistances, setShowDistances] = useState(false);
  const [showBindingEnergy, setShowBindingEnergy] = useState(true);
  const [selectedPose, setSelectedPose] = useState(0);
  const [ligandSdf, setLigandSdf] = useState<string | null>(null);
  const [poses, setPoses] = useState<DockingPose[]>([]);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [dockingActive, setDockingActive] = useState(false);

  const loadDockingResult = useCallback((sdfData: string, dockingPoses: DockingPose[], score: number | null) => {
    setLigandSdf(sdfData);
    setPoses(dockingPoses);
    setBestScore(score);
    setDockingActive(true);
    setSelectedPose(0);
  }, []);

  const clearDocking = useCallback(() => {
    setLigandSdf(null);
    setPoses([]);
    setBestScore(null);
    setDockingActive(false);
  }, []);

  // Apply view mode to viewer
  useEffect(() => {
    const v = viewerRef.current;
    if (!v || !pdbData || !dockingActive) return;

    try {
      v.removeAllSurfaces();

      switch (viewMode) {
        case "protein":
          v.setStyle({ model: 0 }, { cartoon: { color: "spectrum", thickness: 0.4 } });
          if (ligandSdf) v.setStyle({ model: 1 }, { stick: { hidden: true } });
          break;
        case "ligand":
          v.setStyle({ model: 0 }, { cartoon: { hidden: true } });
          if (ligandSdf) v.setStyle({ model: 1 }, {
            stick: { colorscheme: "Jmol", radius: 0.18 },
            sphere: { colorscheme: "Jmol", scale: 0.3 },
          });
          break;
        default: // both
          v.setStyle({ model: 0 }, { cartoon: { color: "spectrum", thickness: 0.4 } });
          if (ligandSdf) v.setStyle({ model: 1 }, {
            stick: { colorscheme: "Jmol", radius: 0.15 },
            sphere: { colorscheme: "Jmol", scale: 0.28 },
          });
      }

      v.render();
    } catch (e) {
      console.warn("Docking view mode error:", e);
    }
  }, [viewMode, viewerRef, pdbData, ligandSdf, dockingActive]);

  // Draw H-bonds and distance lines
  useEffect(() => {
    const v = viewerRef.current;
    if (!v || !dockingActive || !ligandSdf) return;

    try {
      v.removeAllShapes();

      const ligandAtoms = v.getModel(1)?.selectedAtoms({}) ?? [];
      const proteinAtoms = v.getModel(0)?.selectedAtoms({}) ?? [];
      const pose = poses[selectedPose];
      const interactions = Array.isArray(pose?.interactions) ? pose.interactions : [];

      if (showHBonds && interactions.length > 0) {
        const hbonds = interactions.filter((i: any) =>
          typeof i.type === "string" && i.type.startsWith("H-bond")
        );
        const polarLigand = ligandAtoms.filter((a: any) => ["O", "N", "S"].includes(a.elem));

        hbonds.forEach((interaction: any, idx: number) => {
          const match = interaction.residue?.match(/^([A-Z]+)(\d+)$/);
          const resName = match?.[1];
          const resNum = match ? parseInt(match[2]) : null;

          let proteinAtom: any = null;
          if (resName && resNum) {
            proteinAtom = proteinAtoms.find(
              (a: any) => a.resn === resName && a.resi === resNum && (a.elem === "O" || a.elem === "N")
            ) ?? proteinAtoms.find((a: any) => a.resn === resName && a.resi === resNum);
          }

          const ligandAtom = polarLigand[idx % Math.max(1, polarLigand.length)]
            ?? ligandAtoms[idx % Math.max(1, ligandAtoms.length)];

          if (proteinAtom && ligandAtom) {
            v.addCylinder({
              start: { x: ligandAtom.x, y: ligandAtom.y, z: ligandAtom.z },
              end: { x: proteinAtom.x, y: proteinAtom.y, z: proteinAtom.z },
              radius: 0.045, fromCap: 1, toCap: 1,
              color: "0x2dd4bf", opacity: 0.75, dashed: true,
            });

            // Distance label
            if (showDistances) {
              const mx = (ligandAtom.x + proteinAtom.x) / 2;
              const my = (ligandAtom.y + proteinAtom.y) / 2;
              const mz = (ligandAtom.z + proteinAtom.z) / 2;
              const dist = interaction.distance_angstrom ?? Math.sqrt(
                (ligandAtom.x - proteinAtom.x) ** 2 +
                (ligandAtom.y - proteinAtom.y) ** 2 +
                (ligandAtom.z - proteinAtom.z) ** 2
              );
              v.addLabel(`${dist.toFixed(1)}Å`, {
                position: { x: mx, y: my, z: mz },
                fontSize: 10, fontColor: "white",
                backgroundColor: "rgba(0,0,0,0.6)",
                borderThickness: 0,
              });
            }
          }
        });
      }

      v.render();
    } catch (e) {
      console.warn("Docking shapes error:", e);
    }
  }, [showHBonds, showDistances, viewerRef, dockingActive, ligandSdf, poses, selectedPose]);

  return {
    viewMode, setViewMode,
    showHBonds, setShowHBonds,
    showDistances, setShowDistances,
    showBindingEnergy, setShowBindingEnergy,
    selectedPose, setSelectedPose,
    poses, bestScore, ligandSdf, dockingActive,
    loadDockingResult, clearDocking,
  };
}
