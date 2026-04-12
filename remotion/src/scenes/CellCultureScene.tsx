import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { ToolLabel } from "../components/ToolLabel";

export const CellCultureScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Growth curve data points
  const dataPoints = [0, 5, 12, 28, 52, 78, 92, 96, 98, 99, 99.5];
  const drawProgress = interpolate(frame, [10, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const visiblePoints = Math.floor(dataPoints.length * drawProgress);

  const chartX = 120;
  const chartY = 180;
  const chartW = 800;
  const chartH = 500;

  const pointCoords = dataPoints.map((v, i) => ({
    x: chartX + (i / (dataPoints.length - 1)) * chartW,
    y: chartY + chartH - (v / 100) * chartH,
  }));

  const visibleCoords = pointCoords.slice(0, visiblePoints);
  const linePath = visibleCoords.length > 1
    ? visibleCoords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
    : "";

  // Contamination risk badge
  const badgeOpacity = interpolate(frame, [70, 85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const badgePulse = Math.sin(frame * 0.15) * 0.15 + 1;

  return (
    <AbsoluteFill style={{ background: "#181C2A" }}>
      <ToolLabel label="CellCulture AI" icon="🧫" />

      {/* Chart */}
      <svg width="1920" height="1080" style={{ position: "absolute" }}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((v) => {
          const y = chartY + chartH - (v / 100) * chartH;
          return (
            <g key={v}>
              <line x1={chartX} y1={y} x2={chartX + chartW} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
              <text x={chartX - 15} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.3)" fontFamily="Inter, sans-serif" fontSize="12">{v}%</text>
            </g>
          );
        })}

        {/* Axis labels */}
        <text x={chartX + chartW / 2} y={chartY + chartH + 50} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontFamily="Inter, sans-serif" fontSize="14">
          Time (hours)
        </text>
        <text x={chartX - 55} y={chartY + chartH / 2} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontFamily="Inter, sans-serif" fontSize="14" transform={`rotate(-90, ${chartX - 55}, ${chartY + chartH / 2})`}>
          Confluence (%)
        </text>

        {/* Growth curve */}
        {linePath && (
          <>
            <path d={linePath + ` L ${visibleCoords[visibleCoords.length - 1].x} ${chartY + chartH} L ${visibleCoords[0].x} ${chartY + chartH} Z`} fill="rgba(45,212,168,0.1)" />
            <path d={linePath} stroke="#2DD4A8" strokeWidth={3} fill="none" />
          </>
        )}

        {/* Data points */}
        {visibleCoords.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={5} fill="#2DD4A8" stroke="#181C2A" strokeWidth={2} />
        ))}
      </svg>

      {/* AI Analysis panel */}
      <div
        style={{
          position: "absolute",
          right: 80,
          top: 140,
          width: 480,
          background: "rgba(255,255,255,0.05)",
          borderRadius: 20,
          border: "1px solid rgba(45,212,168,0.2)",
          padding: 32,
        }}
      >
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: "#fff", fontWeight: 600, marginBottom: 24 }}>
          AI Predictions
        </div>

        {/* Contamination risk */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 16,
            background: "rgba(45,212,168,0.08)",
            borderRadius: 12,
            marginBottom: 20,
            opacity: badgeOpacity,
            transform: `scale(${badgePulse})`,
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#2DD4A8" }} />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "#2DD4A8", fontWeight: 600 }}>
            Low Contamination Risk
          </span>
        </div>

        {/* Predicted metrics */}
        {[
          { label: "Growth Rate", value: "0.42/hr" },
          { label: "Doubling Time", value: "1.65 hrs" },
          { label: "Optimal Passage", value: "72 hrs" },
        ].map((m, i) => {
          const mOpacity = interpolate(frame, [50 + i * 12, 65 + i * 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, opacity: mOpacity }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)" }}>{m.label}</span>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#fff", fontWeight: 600 }}>{m.value}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
