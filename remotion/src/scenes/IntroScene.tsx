import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 15, stiffness: 200 } });
  const textOpacity = interpolate(frame, [10, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textY = interpolate(frame, [10, 25], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
      {/* Logo icon */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          marginBottom: 30,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#2DD4A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 3h15" /><path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3" />
          <path d="M6 14h12" />
        </svg>
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 56,
            fontWeight: 800,
            color: "#FFFFFF",
            letterSpacing: "-0.03em",
          }}
        >
          ORDEX Systems
        </span>
      </div>

      <div
        style={{
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
          fontFamily: "Inter, sans-serif",
          fontSize: 28,
          color: "rgba(255,255,255,0.6)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        See it in action
      </div>
    </AbsoluteFill>
  );
};
