import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { ToolLabel } from "../components/ToolLabel";

export const ProteinScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardS = spring({ frame, fps, config: { damping: 20, stiffness: 200 } });
  const cardX = interpolate(cardS, [0, 1], [-100, 0]);

  // Animated sequence text
  const seq = "MKTVRQERLKSIVRILERSKEPVSGAQLAEELSVSRQVIVQDIAYLRSLGYNIVATPRGYVLAGG";
  const visibleChars = Math.min(Math.floor(frame / 1.2), seq.length);

  // pLDDT counter
  const scoreTarget = 87.4;
  const score = interpolate(frame, [30, 90], [0, scoreTarget], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Protein wireframe - animated helix
  const helixProgress = interpolate(frame, [20, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const helixPoints: { x: number; y: number }[] = [];
  const totalPoints = 60;
  const drawnPoints = Math.floor(totalPoints * helixProgress);
  for (let i = 0; i < drawnPoints; i++) {
    const t = i / totalPoints;
    helixPoints.push({
      x: 960 + 200 + Math.sin(t * Math.PI * 6) * 120,
      y: 200 + t * 600,
    });
  }

  const helixPath = helixPoints.length > 1
    ? helixPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
    : "";

  return (
    <AbsoluteFill style={{ background: "#181C2A" }}>
      <ToolLabel label="Protein Prediction" icon="🧬" />

      {/* Card */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 140,
          width: 700,
          background: "rgba(255,255,255,0.05)",
          borderRadius: 20,
          border: "1px solid rgba(45,212,168,0.2)",
          padding: 40,
          opacity: cardS,
          transform: `translateX(${cardX}px)`,
        }}
      >
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
          Input Sequence
        </div>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 18,
            color: "#2DD4A8",
            wordBreak: "break-all",
            lineHeight: 1.6,
            minHeight: 120,
          }}
        >
          {seq.slice(0, visibleChars)}
          <span style={{ opacity: frame % 20 > 10 ? 1 : 0, color: "#fff" }}>|</span>
        </div>

        {/* Score */}
        <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "rgba(255,255,255,0.4)" }}>pLDDT Score</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 48, fontWeight: 700, color: "#2DD4A8" }}>
            {score.toFixed(1)}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 16, height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4 }}>
          <div
            style={{
              width: `${(score / 100) * 100}%`,
              height: "100%",
              background: "linear-gradient(90deg, #2DD4A8, #1a9e7a)",
              borderRadius: 4,
            }}
          />
        </div>
      </div>

      {/* Protein wireframe */}
      <svg width="1920" height="1080" style={{ position: "absolute", top: 0, left: 0 }}>
        {helixPath && (
          <path d={helixPath} stroke="#2DD4A8" strokeWidth={3} fill="none" opacity={0.8} />
        )}
        {helixPoints.map((p, i) =>
          i % 3 === 0 ? (
            <circle key={i} cx={p.x} cy={p.y} r={5} fill="#2DD4A8" opacity={0.6} />
          ) : null
        )}
      </svg>
    </AbsoluteFill>
  );
};
