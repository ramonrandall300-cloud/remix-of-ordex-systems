import { useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile, Sequence } from "remotion";

interface ScreenshotSceneProps {
  image: string;
  toolName: string;
  toolIcon: string;
  /** Where the camera starts — crop region for "inputs" */
  inputRegion: { x: number; y: number; scale: number };
  /** Where the camera pans to — crop region for "results" */
  resultRegion: { x: number; y: number; scale: number };
}

export const ScreenshotScene: React.FC<ScreenshotSceneProps> = ({
  image,
  toolName,
  toolIcon,
  inputRegion,
  resultRegion,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Phase 1: frames 0-15 — fade in + label appears
  // Phase 2: frames 15-50 — hold on input region  
  // Phase 3: frames 50-100 — pan to result region
  // Phase 4: frames 100-end — hold on result

  const holdEnd = 40;
  const panStart = 45;
  const panEnd = 95;

  const panProgress = interpolate(frame, [panStart, panEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Smooth easing
  const eased = 0.5 - 0.5 * Math.cos(Math.PI * panProgress);

  const camX = interpolate(eased, [0, 1], [inputRegion.x, resultRegion.x]);
  const camY = interpolate(eased, [0, 1], [inputRegion.y, resultRegion.y]);
  const camScale = interpolate(eased, [0, 1], [inputRegion.scale, resultRegion.scale]);

  // Fade in
  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  // Label animation
  const labelSpring = spring({ frame, fps, config: { damping: 20, stiffness: 200 } });
  const labelY = interpolate(labelSpring, [0, 1], [30, 0]);

  // "Inputs" / "Results" indicator
  const showingResults = frame > panEnd;
  const phaseLabel = showingResults ? "Results" : "Inputs";
  const phaseFade = showingResults
    ? interpolate(frame, [panEnd, panEnd + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : interpolate(frame, [5, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{
      width: "100%",
      height: "100%",
      background: "#0F1219",
      overflow: "hidden",
      position: "relative",
      opacity: fadeIn,
    }}>
      {/* Screenshot with camera pan */}
      <div style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Img
          src={staticFile(image)}
          style={{
            position: "absolute",
            transformOrigin: "top left",
            transform: `scale(${camScale}) translate(${-camX}px, ${-camY}px)`,
            borderRadius: 12,
          }}
        />
      </div>

      {/* Vignette overlay */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse at center, transparent 50%, rgba(15,18,25,0.7) 100%)",
        pointerEvents: "none",
      }} />

      {/* Tool label - top left */}
      <div style={{
        position: "absolute",
        top: 36,
        left: 60,
        display: "flex",
        alignItems: "center",
        gap: 14,
        opacity: labelSpring,
        transform: `translateY(${labelY}px)`,
      }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: "rgba(45, 212, 168, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
        }}>
          {toolIcon}
        </div>
        <span style={{
          color: "#2DD4A8",
          fontSize: 26,
          fontFamily: "Inter, sans-serif",
          fontWeight: 600,
          letterSpacing: "-0.02em",
        }}>
          {toolName}
        </span>
      </div>

      {/* Phase indicator - bottom right */}
      <div style={{
        position: "absolute",
        bottom: 36,
        right: 60,
        opacity: phaseFade,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: showingResults ? "#2DD4A8" : "#F59E0B",
        }} />
        <span style={{
          color: showingResults ? "#2DD4A8" : "#F59E0B",
          fontSize: 18,
          fontFamily: "Inter, sans-serif",
          fontWeight: 500,
        }}>
          {phaseLabel}
        </span>
      </div>
    </div>
  );
};
