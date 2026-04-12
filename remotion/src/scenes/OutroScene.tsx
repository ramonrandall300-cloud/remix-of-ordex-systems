import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame, fps, config: { damping: 15, stiffness: 150 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const y = interpolate(s, [0, 1], [30, 0]);

  return (
    <AbsoluteFill
      style={{
        background: "#181C2A",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${y}px)`,
          fontFamily: "Inter, sans-serif",
          fontSize: 52,
          fontWeight: 800,
          color: "#FFFFFF",
          letterSpacing: "-0.03em",
        }}
      >
        Start Building
      </div>
      <div
        style={{
          opacity: interpolate(frame, [8, 20], [0, 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          fontFamily: "Inter, sans-serif",
          fontSize: 22,
          color: "rgba(255,255,255,0.5)",
          marginTop: 16,
        }}
      >
        ordexsystems.com
      </div>
    </AbsoluteFill>
  );
};
