import { useState, useEffect, useRef } from "react";

/**
 * Manages loading the 3Dmol.js script and creating/destroying the viewer instance.
 */
export function use3DMol(containerRef: React.RefObject<HTMLDivElement>) {
  const [libLoaded, setLibLoaded] = useState(false);
  const viewerRef = useRef<any>(null);

  // Load 3Dmol script
  useEffect(function loadScript() {
    if (document.getElementById("3dmol-script")) {
      if ((window as any).$3Dmol) {
        setLibLoaded(true);
        return;
      }
    } else {
      const script = document.createElement("script");
      script.id = "3dmol-script";
      script.src = "https://3dmol.csb.pitt.edu/build/3Dmol-min.js";
      script.async = true;
      document.head.appendChild(script);
    }

    const poll = setInterval(() => {
      if ((window as any).$3Dmol) {
        setLibLoaded(true);
        clearInterval(poll);
      }
    }, 100);

    return () => clearInterval(poll);
  }, []);

  // Initialize viewer once lib + container are ready
  useEffect(() => {
    if (!libLoaded || !containerRef.current || viewerRef.current) return;
    const mol = (window as any).$3Dmol;
    viewerRef.current = mol.createViewer(containerRef.current, {
      backgroundColor: "transparent",
      antialias: true,
    });
  }, [libLoaded, containerRef]);

  return { libLoaded, viewerRef };
}
