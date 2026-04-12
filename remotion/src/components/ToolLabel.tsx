import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";

export const ToolLabel: React.FC<{ label: string; icon: string }> = ({ label, icon }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 20, stiffness: 200 } });
  const y = interpolate(s, [0, 1], [30, 0]);
  const opacity = interpolate(s, [0, 1], [0, 1]);

  return (
    <div
      style={{
        position: "absolute",
        top: 40,
        left: 80,
        display: "flex",
        alignItems: "center",
        gap: 16,
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: "rgba(45, 212, 168, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
        }}
      >
        {icon}
      </div>
      <span
        style={{
          color: "#2DD4A8",
          fontSize: 28,
          fontFamily: "Inter, sans-serif",
          fontWeight: 600,
          letterSpacing: "-0.02em",
        }}
      >
        {label}
      </span>
    </div>
  );
};
