import { useState, useMemo } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface Feature {
  id: number;
  name: string;
  start: number;
  end: number;
  color: string;
  type: string;
  strand: number;
}

export interface PlasmidData {
  name: string;
  size: number;
  features: Feature[];
}

interface PlasmidDesignerProps {
  name: string;
  sequence: string;
  sequenceType: string;
}

// ─── Feature auto-detection ──────────────────────────────────────────────────
const RESTRICTION_SITES: Record<string, string> = {
  EcoRI: "GAATTC",
  BamHI: "GGATCC",
  HindIII: "AAGCTT",
  XhoI: "CTCGAG",
  NcoI: "CCATGG",
  NdeI: "CATATG",
  BglII: "AGATCT",
  SalI: "GTCGAC",
  XbaI: "TCTAGA",
  PstI: "CTGCAG",
  SpeI: "ACTAGT",
  NotI: "GCGGCCGC",
  KpnI: "GGTACC",
  SacI: "GAGCTC",
  ApaI: "GGGCCC",
  ClaI: "ATCGAT",
  SmaI: "CCCGGG",
  BsaI: "GGTCTC",
  BbsI: "GAAGAC",
};

const FEATURE_COLORS: Record<string, string> = {
  restriction: "#e879f9",
  start_codon: "#34d399",
  stop_codon: "#fb7185",
  promoter: "#5eead4",
  orf: "#60a5fa",
};

function detectFeatures(seq: string, seqType: string): Feature[] {
  if (!seq || seqType === "Protein") return [];
  const upper = seq.toUpperCase().replace(/[^ATGCU]/g, "");
  if (!upper.length) return [];

  const features: Feature[] = [];
  let nextId = 1;

  // Detect restriction enzyme sites
  for (const [enzyme, site] of Object.entries(RESTRICTION_SITES)) {
    let idx = 0;
    while ((idx = upper.indexOf(site, idx)) !== -1) {
      features.push({
        id: nextId++,
        name: enzyme,
        start: idx,
        end: idx + site.length,
        color: FEATURE_COLORS.restriction,
        type: "restriction",
        strand: 0,
      });
      idx += 1;
    }
  }

  // Detect start codons (ATG)
  const startCodon = seqType === "RNA" ? "AUG" : "ATG";
  let sIdx = 0;
  const startPositions: number[] = [];
  while ((sIdx = upper.indexOf(startCodon, sIdx)) !== -1) {
    if (sIdx % 3 === 0) {
      startPositions.push(sIdx);
      features.push({
        id: nextId++,
        name: "Start (ATG)",
        start: sIdx,
        end: sIdx + 3,
        color: FEATURE_COLORS.start_codon,
        type: "start_codon",
        strand: 1,
      });
    }
    sIdx += 1;
  }

  // Detect stop codons (TAA, TAG, TGA)
  const stopCodons = seqType === "RNA" ? ["UAA", "UAG", "UGA"] : ["TAA", "TAG", "TGA"];
  for (const stop of stopCodons) {
    let idx = 0;
    while ((idx = upper.indexOf(stop, idx)) !== -1) {
      if (idx % 3 === 0) {
        features.push({
          id: nextId++,
          name: `Stop (${stop})`,
          start: idx,
          end: idx + 3,
          color: FEATURE_COLORS.stop_codon,
          type: "stop_codon",
          strand: 1,
        });
      }
      idx += 1;
    }
  }

  // Detect ORFs (ATG → stop, min 30 codons)
  for (const orfStart of startPositions) {
    for (let pos = orfStart + 3; pos + 2 < upper.length; pos += 3) {
      const codon = upper.slice(pos, pos + 3);
      if (stopCodons.includes(codon)) {
        const orfLen = pos + 3 - orfStart;
        if (orfLen >= 90) {
          features.push({
            id: nextId++,
            name: `ORF (${Math.floor(orfLen / 3)} aa)`,
            start: orfStart,
            end: pos + 3,
            color: FEATURE_COLORS.orf,
            type: "orf",
            strand: 1,
          });
        }
        break;
      }
    }
  }

  // Sort by start position
  features.sort((a, b) => a.start - b.start);
  return features;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const FEATURE_TYPE_LABELS: Record<string, string> = {
  promoter: "Promoter",
  terminator: "Terminator",
  resistance: "Resistance",
  regulatory: "Regulatory",
  ori: "Origin",
  tag: "Tag",
  mcs: "MCS",
  restriction: "Restriction Site",
  start_codon: "Start Codon",
  stop_codon: "Stop Codon",
  orf: "Open Reading Frame",
};

function formatBp(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)} kb` : `${n} bp`;
}

// ─── Circular Map ────────────────────────────────────────────────────────────
function CircularMap({ plasmid, selectedFeature, onSelectFeature }: { plasmid: PlasmidData; selectedFeature: Feature | null; onSelectFeature: (f: Feature | null) => void }) {
  const cx = 200, cy = 200, outerR = 155, innerR = 115, tickR = 162;
  const { size, features, name } = plasmid;

  function featureArc(start: number, end: number, r1: number, r2: number) {
    if (size === 0) return "";
    const s = (start / size) * 2 * Math.PI - Math.PI / 2;
    const e = (end / size) * 2 * Math.PI - Math.PI / 2;
    const gap = 0.012;
    const sa = s + gap, ea = e - gap;
    if (ea <= sa) return "";
    const x1o = cx + r2 * Math.cos(sa), y1o = cy + r2 * Math.sin(sa);
    const x2o = cx + r2 * Math.cos(ea), y2o = cy + r2 * Math.sin(ea);
    const x1i = cx + r1 * Math.cos(sa), y1i = cy + r1 * Math.sin(sa);
    const x2i = cx + r1 * Math.cos(ea), y2i = cy + r1 * Math.sin(ea);
    const lg = ea - sa > Math.PI ? 1 : 0;
    return `M ${x1o} ${y1o} A ${r2} ${r2} 0 ${lg} 1 ${x2o} ${y2o} L ${x2i} ${y2i} A ${r1} ${r1} 0 ${lg} 0 ${x1i} ${y1i} Z`;
  }

  const ticks = size > 0 ? Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * 2 * Math.PI - Math.PI / 2;
    return {
      x1: cx + (outerR + 4) * Math.cos(a), y1: cy + (outerR + 4) * Math.sin(a),
      x2: cx + tickR * Math.cos(a), y2: cy + tickR * Math.sin(a),
      lx: cx + (tickR + 10) * Math.cos(a), ly: cy + (tickR + 10) * Math.sin(a),
      label: Math.round((i / 8) * size),
    };
  }) : [];

  return (
    <svg viewBox="0 0 400 400" className="w-full max-w-[400px] block mx-auto">
      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="hsl(var(--secondary))" strokeWidth={outerR - innerR} />
      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="hsl(var(--primary) / 0.13)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="hsl(var(--primary) / 0.13)" strokeWidth="1" />

      {features.map(f => {
        const isSelected = selectedFeature?.id === f.id;
        const r1 = f.strand === -1 ? innerR : (innerR + (outerR - innerR) * 0.45);
        const r2 = f.strand === -1 ? (innerR + (outerR - innerR) * 0.45) : outerR;
        const d = featureArc(f.start, f.end, r1, r2);
        return (
          <path key={f.id} d={d} fill={f.color}
            opacity={isSelected ? 1 : 0.82}
            stroke={isSelected ? "#fff" : "none"} strokeWidth={isSelected ? 1.5 : 0}
            className="cursor-pointer transition-opacity duration-150"
            onClick={() => onSelectFeature(isSelected ? null : f)}
          />
        );
      })}

      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="hsl(var(--primary) / 0.33)" strokeWidth="1" />
          <text x={t.lx} y={t.ly} textAnchor="middle" dominantBaseline="middle"
            className="font-mono" style={{ fontSize: 8, fill: "hsl(var(--primary) / 0.33)" }}>
            {t.label}
          </text>
        </g>
      ))}

      <text x={cx} y={cy - 10} textAnchor="middle" className="font-mono" style={{ fontSize: 15, fontWeight: 600, fill: "hsl(var(--foreground))" }}>
        {name || "—"}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="font-mono" style={{ fontSize: 12, fill: "hsl(var(--primary))" }}>
        {size > 0 ? formatBp(size) : ""}
      </text>

      {size === 0 && (
        <circle cx={cx} cy={cy} r={outerR - 20} fill="none" stroke="hsl(var(--primary) / 0.2)" strokeWidth="2" strokeDasharray="8 4" />
      )}
    </svg>
  );
}

// ─── Linear Map ──────────────────────────────────────────────────────────────
function LinearMap({ plasmid, selectedFeature, onSelectFeature }: { plasmid: PlasmidData; selectedFeature: Feature | null; onSelectFeature: (f: Feature | null) => void }) {
  const { size, features } = plasmid;
  const trackH = 32, padding = 40;
  const svgW = 700;
  const trackW = svgW - padding * 2;

  const rows: { features: Feature[]; y: number; label: string }[] = [];
  if (features.length > 0) {
    const forward = features.filter(f => f.strand >= 0);
    const reverse = features.filter(f => f.strand === -1);
    if (forward.length) rows.push({ features: forward, y: 20, label: "5′→3′" });
    if (reverse.length) rows.push({ features: reverse, y: forward.length ? 80 : 20, label: "3′←5′" });
  }

  function featX(pos: number) { return padding + (pos / size) * trackW; }
  function featW(start: number, end: number) { return Math.max(4, ((end - start) / size) * trackW); }

  const ticks = size > 0 ? Array.from({ length: 9 }, (_, i) => ({
    x: padding + (i / 8) * trackW,
    label: Math.round((i / 8) * size),
  })) : [];

  const svgH = rows.length > 1 ? 160 : 100;

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full block">
      {rows.map(row => (
        <g key={row.label}>
          <line x1={padding} y1={row.y + trackH / 2} x2={padding + trackW} y2={row.y + trackH / 2}
            stroke="hsl(var(--primary) / 0.2)" strokeWidth="2" />
          <text x={padding - 6} y={row.y + trackH / 2} textAnchor="end" dominantBaseline="middle"
            className="font-mono" style={{ fontSize: 9, fill: "hsl(var(--primary) / 0.4)" }}>{row.label}</text>
        </g>
      ))}

      {rows.map(row =>
        row.features.map(f => {
          const x = featX(f.start), w = featW(f.start, f.end);
          const isSelected = selectedFeature?.id === f.id;
          const isRestriction = f.type === "restriction";
          return (
            <g key={f.id} className="cursor-pointer" onClick={() => onSelectFeature(isSelected ? null : f)}>
              {isRestriction ? (
                <line x1={x} y1={row.y} x2={x} y2={row.y + trackH}
                  stroke={f.color} strokeWidth={isSelected ? 2.5 : 1.5} opacity={0.9} />
              ) : (
                <rect x={x} y={row.y} width={w} height={trackH} rx={3}
                  fill={f.color} opacity={isSelected ? 1 : 0.82}
                  stroke={isSelected ? "#fff" : "none"} strokeWidth={1.5} />
              )}
              {w > 40 && !isRestriction && (
                <text x={x + w / 2} y={row.y + trackH / 2} textAnchor="middle" dominantBaseline="middle"
                  className="font-mono pointer-events-none" style={{ fontSize: 9, fill: "#0f172a", fontWeight: 600 }}>
                  {f.name.length > 10 ? f.name.slice(0, 9) + "…" : f.name}
                </text>
              )}
            </g>
          );
        })
      )}

      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={t.x} y1={svgH - 22} x2={t.x} y2={svgH - 14} stroke="hsl(var(--primary) / 0.33)" strokeWidth="1" />
          <text x={t.x} y={svgH - 6} textAnchor="middle"
            className="font-mono" style={{ fontSize: 9, fill: "hsl(var(--primary) / 0.45)" }}>
            {t.label}
          </text>
        </g>
      ))}

      {size === 0 && (
        <>
          <line x1={padding} y1={svgH / 2} x2={padding + trackW} y2={svgH / 2}
            stroke="hsl(var(--primary) / 0.13)" strokeWidth="2" strokeDasharray="8 4" />
          <text x={svgW / 2} y={svgH / 2 - 14} textAnchor="middle"
            className="font-mono" style={{ fontSize: 12, fill: "hsl(var(--primary) / 0.33)" }}>
            No sequence loaded
          </text>
        </>
      )}
    </svg>
  );
}

// ─── Feature Panel ───────────────────────────────────────────────────────────
function FeaturePanel({ features, selectedFeature, onSelectFeature }: { features: Feature[]; selectedFeature: Feature | null; onSelectFeature: (f: Feature | null) => void }) {
  const grouped = Object.entries(
    features.reduce<Record<string, Feature[]>>((acc, f) => {
      const t = f.type || "other";
      if (!acc[t]) acc[t] = [];
      acc[t].push(f);
      return acc;
    }, {})
  );

  return (
    <div className="mt-4">
      {grouped.length === 0 ? (
        <p className="text-muted-foreground font-mono text-xs text-center my-6">Enter a sequence to detect features</p>
      ) : (
        grouped.map(([type, feats]) => (
          <div key={type} className="mb-3">
            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1.5">
              {FEATURE_TYPE_LABELS[type] || type} ({feats.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {feats.map(f => {
                const isSelected = selectedFeature?.id === f.id;
                return (
                  <button key={f.id} onClick={() => onSelectFeature(isSelected ? null : f)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-foreground font-mono text-[11px] transition-all duration-150 border cursor-pointer"
                    style={{
                      background: isSelected ? f.color + "33" : "hsl(var(--secondary))",
                      borderColor: isSelected ? f.color : "hsl(var(--border))",
                    }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: f.color }} />
                    <span>{f.name}</span>
                    <span className="text-muted-foreground text-[10px]">{f.start}–{f.end}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Feature Detail ──────────────────────────────────────────────────────────
function FeatureDetail({ feature, plasmidSize }: { feature: Feature | null; plasmidSize: number }) {
  if (!feature) return null;
  const length = feature.end - feature.start;
  const pct = plasmidSize > 0 ? ((length / plasmidSize) * 100).toFixed(1) : 0;
  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-2 rounded-lg p-3 mt-3"
      style={{ background: feature.color + "18", border: `1px solid ${feature.color}55` }}>
      {[
        ["Name", feature.name],
        ["Type", FEATURE_TYPE_LABELS[feature.type] || feature.type],
        ["Strand", feature.strand === 1 ? "Forward (+)" : feature.strand === -1 ? "Reverse (−)" : "Both"],
        ["Start", `${feature.start} bp`],
        ["End", `${feature.end} bp`],
        ["Length", `${length} bp (${pct}%)`],
      ].map(([label, val]) => (
        <div key={label}>
          <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">{label}</div>
          <div className="text-xs text-foreground font-mono mt-0.5">{val}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function PlasmidDesigner({ name, sequence, sequenceType }: PlasmidDesignerProps) {
  const [view, setView] = useState<"circular" | "linear">("circular");
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

  const cleanSeq = sequence.toUpperCase().replace(/[^ATGCU]/g, "");
  const size = cleanSeq.length;

  const features = useMemo(() => detectFeatures(sequence, sequenceType), [sequence, sequenceType]);

  const plasmid: PlasmidData = useMemo(() => ({
    name: name || "Untitled",
    size,
    features,
  }), [name, size, features]);

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-base font-bold text-foreground">Plasmid Designer</div>
          <div className="text-xs text-primary mt-0.5">
            {plasmid.name}{plasmid.size > 0 ? ` · ${formatBp(plasmid.size)}` : ""}
            {features.length > 0 && ` · ${features.length} features detected`}
          </div>
        </div>
        <div className="flex gap-1.5 items-center">
          {(["linear", "circular"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono cursor-pointer transition-all border ${view === v ? "bg-primary text-primary-foreground font-bold border-primary" : "bg-secondary text-muted-foreground border-border hover:text-foreground"}`}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="bg-secondary rounded-lg p-4 mb-3">
        {view === "circular"
          ? <CircularMap plasmid={plasmid} selectedFeature={selectedFeature} onSelectFeature={setSelectedFeature} />
          : <LinearMap plasmid={plasmid} selectedFeature={selectedFeature} onSelectFeature={setSelectedFeature} />
        }
      </div>

      <FeatureDetail feature={selectedFeature} plasmidSize={plasmid.size} />

      <FeaturePanel features={features} selectedFeature={selectedFeature} onSelectFeature={setSelectedFeature} />
    </div>
  );
}
