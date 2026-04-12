import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { ToolLabel } from "../components/ToolLabel";

export const SynBioScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Plasmid circle assembling
  const segments = [
    { label: "Promoter", color: "#2DD4A8", startAngle: 0, endAngle: 60 },
    { label: "RBS", color: "#FFB450", startAngle: 65, endAngle: 110 },
    { label: "CDS", color: "#6C8EEF", startAngle: 115, endAngle: 230 },
    { label: "Terminator", color: "#E06C75", startAngle: 235, endAngle: 300 },
    { label: "Origin", color: "#C678DD", startAngle: 305, endAngle: 355 },
  ];

  const assemblyProgress = interpolate(frame, [5, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cx = 600;
  const cy = 520;
  const r = 220;

  const arc = (startDeg: number, endDeg: number) => {
    const s = (startDeg * Math.PI) / 180;
    const e = (endDeg * Math.PI) / 180;
    const sx = cx + r * Math.cos(s);
    const sy = cy + r * Math.sin(s);
    const ex = cx + r * Math.cos(e);
    const ey = cy + r * Math.sin(e);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
  };

  // GC content gauge
  const gcTarget = 52.3;
  const gcValue = interpolate(frame, [40, 90], [0, gcTarget], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // CAI score
  const caiTarget = 0.84;
  const caiValue = interpolate(frame, [50, 100], [0, caiTarget], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#181C2A" }}>
      <ToolLabel label="SynBio Design" icon="🔬" />

      {/* Plasmid */}
      <svg width="1920" height="1080" style={{ position: "absolute" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={20} />
        {segments.map((seg, i) => {
          const segProg = interpolate(assemblyProgress, [i * 0.18, (i + 1) * 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const currentEnd = seg.startAngle + (seg.endAngle - seg.startAngle) * segProg;
          if (segProg <= 0) return null;
          return (
            <g key={i}>
              <path d={arc(seg.startAngle, currentEnd)} stroke={seg.color} strokeWidth={18} fill="none" strokeLinecap="round" />
              {segProg > 0.8 && (
                <text
                  x={cx + (r + 40) * Math.cos(((seg.startAngle + seg.endAngle) / 2 * Math.PI) / 180)}
                  y={cy + (r + 40) * Math.sin(((seg.startAngle + seg.endAngle) / 2 * Math.PI) / 180)}
                  textAnchor="middle"
                  fill={seg.color}
                  fontFamily="Inter, sans-serif"
                  fontSize="13"
                  fontWeight="600"
                >
                  {seg.label}
                </text>
              )}
            </g>
          );
        })}
        <text x={cx} y={cy - 10} textAnchor="middle" fill="#fff" fontFamily="Inter, sans-serif" fontSize="22" fontWeight="700">
          pOrdex-01
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontFamily="Inter, sans-serif" fontSize="14">
          4.2 kb
        </text>
      </svg>

      {/* Stats panel */}
      <div
        style={{
          position: "absolute",
          right: 80,
          top: 140,
          width: 500,
          background: "rgba(255,255,255,0.05)",
          borderRadius: 20,
          border: "1px solid rgba(45,212,168,0.2)",
          padding: 32,
        }}
      >
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: "#fff", fontWeight: 600, marginBottom: 32 }}>
          Design Metrics
        </div>

        {/* GC Content */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.5)" }}>GC Content</span>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 24, fontWeight: 700, color: "#2DD4A8" }}>{gcValue.toFixed(1)}%</span>
          </div>
          <div style={{ height: 10, background: "rgba(255,255,255,0.05)", borderRadius: 5 }}>
            <div style={{ width: `${gcValue}%`, height: "100%", background: "#2DD4A8", borderRadius: 5 }} />
          </div>
        </div>

        {/* CAI */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.5)" }}>Codon Adaptation Index</span>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 24, fontWeight: 700, color: "#6C8EEF" }}>{caiValue.toFixed(2)}</span>
          </div>
          <div style={{ height: 10, background: "rgba(255,255,255,0.05)", borderRadius: 5 }}>
            <div style={{ width: `${caiValue * 100}%`, height: "100%", background: "#6C8EEF", borderRadius: 5 }} />
          </div>
        </div>

        {/* Host */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "rgba(255,255,255,0.5)" }}>Host Organism</span>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "#fff", fontWeight: 500 }}>E. coli K-12</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
