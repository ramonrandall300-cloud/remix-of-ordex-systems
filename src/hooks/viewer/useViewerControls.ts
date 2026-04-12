import { useState, useEffect, useCallback, MutableRefObject } from "react";

/**
 * Applies a representation style to the 3Dmol viewer.
 */
function applyRepresentation(viewer: any, representation: string, coloring: string) {
  if (!viewer) return;
  let colorScheme: any;
  switch (coloring) {
    case "spectrum": colorScheme = "spectrum"; break;
    case "chain": colorScheme = "chain"; break;
    case "bfactor": colorScheme = "b factor"; break;
    case "ss": colorScheme = "ss"; break;
    default: colorScheme = "spectrum";
  }
  viewer.setStyle({}, {});
  viewer.removeAllSurfaces();
  const style: any = {};
  switch (representation) {
    case "surface": style.stick = { colorscheme: colorScheme, radius: 0.15 }; break;
    case "stick": style.stick = { colorscheme: colorScheme }; break;
    case "sphere": style.sphere = { colorscheme: colorScheme }; break;
    case "line": style.line = { colorscheme: colorScheme }; break;
    default: style.cartoon = { colorscheme: colorScheme };
  }
  viewer.setStyle({}, style);
  if (representation === "surface") {
    viewer.addSurface(
      (window as any).$3Dmol?.SurfaceType?.VDW ?? 1,
      { opacity: 0.85, colorscheme: colorScheme },
      {}
    );
  }
  viewer.render();
}

export function useViewerControls(
  viewerRef: MutableRefObject<any>,
  containerRef: React.RefObject<HTMLDivElement>,
  pdbData: string | null,
  pdbFormat: string,
) {
  const [representation, setRepresentation] = useState("cartoon");
  const [coloring, setColoring] = useState("chain");
  const [bgTransparency, setBgTransparency] = useState(true);
  const [spinning, setSpinning] = useState(false);

  // Load model when pdbData changes
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !pdbData) return;
    viewer.removeAllModels();
    viewer.addModel(pdbData, pdbFormat);
    applyRepresentation(viewer, representation, coloring);
    viewer.zoomTo();
    viewer.render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdbData]);

  // Style changes
  useEffect(() => {
    if (!viewerRef.current || !pdbData) return;
    applyRepresentation(viewerRef.current, representation, coloring);
  }, [representation, coloring, pdbData, viewerRef]);

  // Background
  useEffect(() => {
    if (!viewerRef.current) return;
    viewerRef.current.setBackgroundColor(bgTransparency ? "transparent" : "#1a1a2e");
    viewerRef.current.render();
  }, [bgTransparency, viewerRef]);

  // Spinning
  useEffect(() => {
    if (!viewerRef.current || !pdbData) return;
    viewerRef.current.spin(spinning ? "y" : false);
  }, [spinning, pdbData, viewerRef]);

  const zoomIn = useCallback(() => { viewerRef.current?.zoom(1.2); viewerRef.current?.render(); }, [viewerRef]);
  const zoomOut = useCallback(() => { viewerRef.current?.zoom(0.8); viewerRef.current?.render(); }, [viewerRef]);
  const resetView = useCallback(() => { viewerRef.current?.zoomTo(); viewerRef.current?.render(); }, [viewerRef]);
  const fullscreen = useCallback(() => { containerRef.current?.requestFullscreen?.(); }, [containerRef]);

  return {
    representation, setRepresentation,
    coloring, setColoring,
    bgTransparency, setBgTransparency,
    spinning, setSpinning,
    zoomIn, zoomOut, resetView, fullscreen,
  };
}
