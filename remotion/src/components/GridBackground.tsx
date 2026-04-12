import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const GridBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 750], [0, -40]);

  const dots: { x: number; y: number }[] = [];
  for (let x = 0; x < 1920; x += 60) {
    for (let y = 0; y < 1080; y += 60) {
      dots.push({ x, y });
    }
  }

  return (
    <AbsoluteFill style={{ background: "#181C2A" }}>
      <svg width="1920" height="1080" style={{ transform: `translateY(${drift}px)` }}>
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={1.5}
            fill="rgba(45, 212, 168, 0.12)"
          />
        ))}
      </svg>
    </AbsoluteFill>
  );
};
