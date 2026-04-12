import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { ToolLabel } from "../components/ToolLabel";

export const ViewerScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Rotating wireframe molecule
  const rotationAngle = interpolate(frame, [0, 90], [0, 360]);

  // Generate a wireframe sphere-like structure
  const nodes: { x: number; y: number; z: number }[] = [];
  const edges: [number, number][] = [];

  // Create icosahedron-like vertices
  const phi = (1 + Math.sqrt(5)) / 2;
  const baseVerts = [
    [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
    [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
    [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
  ];

  const scale = 180;
  const cx = 960;
  const cy = 500;
  const angleRad = (rotationAngle * Math.PI) / 180;

  baseVerts.forEach(([x, y, z]) => {
    // Rotate around Y axis
    const rx = x * Math.cos(angleRad) + z * Math.sin(angleRad);
    const rz = -x * Math.sin(angleRad) + z * Math.cos(angleRad);
    nodes.push({ x: cx + rx * scale, y: cy + y * scale, z: rz });
  });

  // Connect nearby vertices
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = baseVerts[i][0] - baseVerts[j][0];
      const dy = baseVerts[i][1] - baseVerts[j][1];
      const dz = baseVerts[i][2] - baseVerts[j][2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 2.5) {
        edges.push([i, j]);
      }
    }
  }

  // Annotation callouts
  const annotations = [
    { text: "Active Site", x: 1250, y: 350, delay: 20 },
    { text: "α-Helix Domain", x: 1250, y: 450, delay: 35 },
    { text: "β-Sheet Region", x: 1250, y: 550, delay: 50 },
  ];

  return (
    <AbsoluteFill style={{ background: "#181C2A" }}>
      <ToolLabel label="3D Viewer" icon="📐" />

      <svg width="1920" height="1080" style={{ position: "absolute" }}>
        {/* Edges */}
        {edges.map(([a, b], i) => {
          const za = (nodes[a].z + 2) / 4;
          const zb = (nodes[b].z + 2) / 4;
          const opacity = (za + zb) / 2 * 0.5 + 0.2;
          return (
            <line
              key={i}
              x1={nodes[a].x}
              y1={nodes[a].y}
              x2={nodes[b].x}
              y2={nodes[b].y}
              stroke="#2DD4A8"
              strokeWidth={1.5}
              opacity={opacity}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((n, i) => {
          const depth = (n.z + 2) / 4;
          const r = 4 + depth * 4;
          return (
            <circle
              key={i}
              cx={n.x}
              cy={n.y}
              r={r}
              fill="#2DD4A8"
              opacity={depth * 0.6 + 0.3}
            />
          );
        })}
      </svg>

      {/* Annotations */}
      {annotations.map((a, i) => {
        const aOpacity = interpolate(frame, [a.delay, a.delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const aX = interpolate(frame, [a.delay, a.delay + 15], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: a.x,
              top: a.y,
              opacity: aOpacity,
              transform: `translateX(${aX}px)`,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ width: 40, height: 2, background: "rgba(45,212,168,0.5)" }} />
            <div
              style={{
                padding: "8px 16px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(45,212,168,0.3)",
                borderRadius: 8,
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                color: "#fff",
                fontWeight: 500,
              }}
            >
              {a.text}
            </div>
          </div>
        );
      })}

      {/* Render style selector */}
      <div
        style={{
          position: "absolute",
          left: 80,
          bottom: 80,
          display: "flex",
          gap: 8,
        }}
      >
        {["Wireframe", "Ball & Stick", "Ribbon", "Surface"].map((style, i) => {
          const selected = i === 0;
          return (
            <div
              key={i}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                background: selected ? "rgba(45,212,168,0.15)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${selected ? "#2DD4A8" : "rgba(255,255,255,0.1)"}`,
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                color: selected ? "#2DD4A8" : "rgba(255,255,255,0.5)",
                fontWeight: selected ? 600 : 400,
              }}
            >
              {style}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
