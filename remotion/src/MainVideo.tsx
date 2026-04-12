import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { wipe } from "@remotion/transitions/wipe";
import { ScreenshotScene } from "./scenes/ScreenshotScene";

const TRANSITION_DURATION = 15;
const transitionConfig = {
  presentation: wipe({ direction: "from-left" }),
  timing: springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION_DURATION }),
};

// Each screenshot: zoom into inputs area, then pan to results area
// Coordinates are based on 1536x768 source images
const scenes = [
  {
    image: "images/protein.png",
    toolName: "Protein Prediction",
    toolIcon: "🧬",
    duration: 150,
    // Start: zoom into Input & Configuration panel (left side)
    inputRegion: { x: 50, y: 20, scale: 2.2 },
    // End: pan to Results Inspector (right side)
    resultRegion: { x: 550, y: 30, scale: 2.0 },
  },
  {
    image: "images/docking.png",
    toolName: "Molecular Docking",
    toolIcon: "⚛️",
    duration: 150,
    // Start: zoom into Input & Configuration (left)
    inputRegion: { x: 50, y: 30, scale: 2.2 },
    // End: pan to Results Inspector with poses (right)
    resultRegion: { x: 600, y: 20, scale: 2.0 },
  },
  {
    image: "images/synbio.png",
    toolName: "SynBio Design",
    toolIcon: "🔬",
    duration: 150,
    // Start: zoom into Sequence Tools (left)
    inputRegion: { x: 40, y: 20, scale: 2.2 },
    // End: pan to Plasmid Designer + Validation (center-right)
    resultRegion: { x: 400, y: 10, scale: 1.8 },
  },
  {
    image: "images/viewer.png",
    toolName: "3D Molecular Viewer",
    toolIcon: "🧊",
    duration: 150,
    // Start: zoom into Structure & Display panel (left)
    inputRegion: { x: 40, y: 20, scale: 2.2 },
    // End: pan to 3D view (center)
    resultRegion: { x: 280, y: 50, scale: 1.9 },
  },
];

const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 15, stiffness: 100 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const scale = interpolate(s, [0, 1], [0.9, 1]);
  const subtitleOp = interpolate(frame, [15, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #0F1219 0%, #151B2B 50%, #0F1219 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      opacity,
      transform: `scale(${scale})`,
    }}>
      <div style={{
        fontSize: 72,
        fontWeight: 700,
        fontFamily: "Inter, sans-serif",
        color: "#FFFFFF",
        letterSpacing: "-0.03em",
        marginBottom: 16,
      }}>
        ORDEX <span style={{ color: "#2DD4A8" }}>Systems</span>
      </div>
      <div style={{
        fontSize: 28,
        color: "#94A3B8",
        fontFamily: "Inter, sans-serif",
        fontWeight: 400,
        opacity: subtitleOp,
      }}>
        Computational Biology Platform
      </div>
    </AbsoluteFill>
  );
};

const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 15, stiffness: 100 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #0F1219 0%, #151B2B 50%, #0F1219 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      opacity,
    }}>
      <div style={{
        fontSize: 52,
        fontWeight: 700,
        fontFamily: "Inter, sans-serif",
        color: "#FFFFFF",
        letterSpacing: "-0.03em",
        marginBottom: 20,
      }}>
        Accelerate <span style={{ color: "#2DD4A8" }}>Discovery</span>
      </div>
      <div style={{
        fontSize: 22,
        color: "#94A3B8",
        fontFamily: "Inter, sans-serif",
      }}>
        ordexsystems.com
      </div>
    </AbsoluteFill>
  );
};

// Total: 45 intro + 4*150 scenes + 45 outro - 5*15 transitions = 555 frames
export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#0F1219" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={45}>
          <IntroScene />
        </TransitionSeries.Sequence>

        {scenes.map((scene, i) => (
          <>
            <TransitionSeries.Transition key={`t-${i}`} {...transitionConfig} />
            <TransitionSeries.Sequence key={i} durationInFrames={scene.duration}>
              <ScreenshotScene
                image={scene.image}
                toolName={scene.toolName}
                toolIcon={scene.toolIcon}
                inputRegion={scene.inputRegion}
                resultRegion={scene.resultRegion}
              />
            </TransitionSeries.Sequence>
          </>
        ))}

        <TransitionSeries.Transition {...transitionConfig} />
        <TransitionSeries.Sequence durationInFrames={45}>
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
