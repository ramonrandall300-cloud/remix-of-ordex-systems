import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { ToolLabel } from "../components/ToolLabel";

export const CrisprScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // DNA double helix
  const helixPoints1: { x: number; y: number }[] = [];
  const helixPoints2: { x: number; y: number }[] = [];
  const drawnLen = interpolate(frame, [5, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const total = 80;
  const drawn = Math.floor(total * drawnLen);

  for (let i = 0; i < drawn; i++) {
    const t = i / total;
    const x = 200 + t * 1500;
    helixPoints1.push({ x, y: 450 + Math.sin(t * Math.PI * 8) * 80 });
    helixPoints2.push({ x, y: 450 - Math.sin(t * Math.PI * 8) * 80 });
  }

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.length > 1 ? pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") : "";

  // Guide RNA highlight zone
  const guideOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Off-target scores
  const scores = [
    { label: "On-target efficiency", value: 94, color: "#2DD4A8" },
    { label: "Off-target sites", value: 12, color: "#FFB450" },
    { label: "Specificity score", value: 88, color: "#2DD4A8" },
  ];

  return (
    <AbsoluteFill style={{ background: "#181C2A" }}>
      <ToolLabel label="CRISPR Lab" icon="🧪" />

      <svg width="1920" height="1080" style={{ position: "absolute" }}>
        <path d={toPath(helixPoints1)} stroke="#2DD4A8" strokeWidth={3} fill="none" opacity={0.6} />
        <path d={toPath(helixPoints2)} stroke="#2DD4A8" strokeWidth={3} fill="none" opacity={0.6} />

        {/* Rungs */}
        {helixPoints1.map((p1, i) => {
          const p2 = helixPoints2[i];
          if (!p2 || i % 4 !== 0) return null;
          return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(45,212,168,0.2)" strokeWidth={1.5} />;
        })}

        {/* Guide RNA highlight */}
        <rect
          x={700}
          y={340}
          width={300}
          height={220}
          rx={12}
          fill="rgba(45,212,168,0.08)"
          stroke="#2DD4A8"
          strokeWidth={2}
          strokeDasharray="8 4"
          opacity={guideOpacity}
        />
        <text x={850} y={330} textAnchor="middle" fill="#2DD4A8" fontFamily="Inter, sans-serif" fontSize="16" fontWeight="600" opacity={guideOpacity}>
          Guide RNA Target
        </text>
      </svg>

      {/* Score bars */}
      <div
        style={{
          position: "absolute",
          right: 80,
          bottom: 120,
          width: 500,
          background: "rgba(255,255,255,0.05)",
          borderRadius: 20,
          border: "1px solid rgba(45,212,168,0.2)",
          padding: 32,
        }}
      >
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: "#fff", fontWeight: 600, marginBottom: 24 }}>
          Analysis Results
        </div>
        {scores.map((s, i) => {
          const barProg = interpolate(frame, [60 + i * 15, 90 + i * 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)" }}>{s.label}</span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: s.color, fontWeight: 600 }}>
                  {Math.round(s.value * barProg)}{s.label === "Off-target sites" ? "" : "%"}
                </span>
              </div>
              <div style={{ height: 10, background: "rgba(255,255,255,0.05)", borderRadius: 5 }}>
                <div style={{ width: `${s.value * barProg}%`, height: "100%", background: s.color, borderRadius: 5 }} />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
