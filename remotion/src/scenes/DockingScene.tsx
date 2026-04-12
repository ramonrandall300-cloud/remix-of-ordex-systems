import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { ToolLabel } from "../components/ToolLabel";

export const DockingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Receptor (left) and ligand (right) approaching each other
  const dockProgress = interpolate(frame, [10, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const receptorX = interpolate(dockProgress, [0, 1], [600, 820]);
  const ligandX = interpolate(dockProgress, [0, 1], [1300, 1060]);

  const scoreOpacity = interpolate(frame, [85, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bestScore = interpolate(frame, [85, 110], [0, -8.7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const cardS = spring({ frame, fps, config: { damping: 20, stiffness: 200 } });

  // Pose bars
  const poses = [-8.7, -7.9, -7.2, -6.8, -6.1];

  return (
    <AbsoluteFill style={{ background: "#181C2A" }}>
      <ToolLabel label="Molecular Docking" icon="⚛️" />

      {/* Receptor shape */}
      <svg width="1920" height="1080" style={{ position: "absolute" }}>
        {/* Receptor - large irregular shape */}
        <g transform={`translate(${receptorX}, 400)`}>
          <path
            d="M0,0 C30,-60 90,-80 140,-40 C180,-10 200,50 160,100 C130,140 60,150 20,120 C-20,90 -30,40 0,0Z"
            fill="rgba(45,212,168,0.15)"
            stroke="#2DD4A8"
            strokeWidth={2}
          />
          <text x="70" y="60" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontFamily="Inter, sans-serif" fontSize="14">Receptor</text>
        </g>

        {/* Ligand - small shape */}
        <g transform={`translate(${ligandX}, 430)`}>
          <path
            d="M0,0 L30,-25 L60,0 L50,35 L10,35Z"
            fill="rgba(255,180,80,0.2)"
            stroke="#FFB450"
            strokeWidth={2}
          />
          <text x="30" y="15" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontFamily="Inter, sans-serif" fontSize="12">Ligand</text>
        </g>

        {/* Binding flash */}
        {dockProgress > 0.95 && (
          <circle cx="940" cy="450" r={interpolate(frame, [80, 95], [0, 60], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} fill="rgba(45,212,168,0.1)" />
        )}
      </svg>

      {/* Results panel */}
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
          opacity: scoreOpacity,
        }}
      >
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
          Binding Energy (kcal/mol)
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 52, fontWeight: 700, color: "#2DD4A8", marginBottom: 24 }}>
          {bestScore.toFixed(1)}
        </div>

        {/* Pose ranking bars */}
        {poses.map((p, i) => {
          const barProgress = interpolate(frame, [95 + i * 8, 110 + i * 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const barW = interpolate(Math.abs(p), [0, 10], [0, 400]);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span style={{ fontFamily: "monospace", fontSize: 14, color: "rgba(255,255,255,0.5)", width: 60 }}>
                Pose {i + 1}
              </span>
              <div style={{ flex: 1, height: 12, background: "rgba(255,255,255,0.05)", borderRadius: 6 }}>
                <div
                  style={{
                    width: barW * barProgress,
                    height: "100%",
                    background: i === 0 ? "#2DD4A8" : "rgba(45,212,168,0.4)",
                    borderRadius: 6,
                  }}
                />
              </div>
              <span style={{ fontFamily: "monospace", fontSize: 14, color: "rgba(255,255,255,0.5)", width: 50 }}>
                {(p * barProgress).toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
