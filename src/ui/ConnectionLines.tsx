// ui/ConnectionLines.tsx — SVG lines + clickable option labels on edges.
import type { LayoutNode } from '../engine/types';

export interface Edge {
  from: LayoutNode;
  to: LayoutNode;
  label: string;
  onLabelClick: () => void;
}

interface Props {
  edges: Edge[];
}

export function ConnectionLines({ edges }: Props) {
  // ---- Precompute label positions to avoid overlaps ----
  const LABEL_Y_OFFSET = 70;
  const MIN_LABEL_SPACING = 150;

  interface LabelPos { x: number; y: number; width: number; }
  const labelPosMap = new Map<number, LabelPos>();

  // Group edge indices by parent node
  const byParent = new Map<string, number[]>();
  edges.forEach((_, i) => {
    const key = edges[i].from.nodeId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(i);
  });

  for (const indices of byParent.values()) {
    const n = indices.length;
    const from = edges[indices[0]].from;
    const baseY = from.y + from.height / 2 + LABEL_Y_OFFSET;

    if (n === 1) {
      const edge = edges[indices[0]];
      const w = Math.max(120, Math.min(200, edge.label.length * 16));
      const midX = (edge.from.x + edge.to.x) / 2;
      labelPosMap.set(indices[0], { x: midX, y: baseY, width: w });
    } else {
      // Sort by child X for stable left-to-right ordering
      const sorted = [...indices].sort((a, b) => edges[a].to.x - edges[b].to.x);
      // Spread labels evenly centered on parent X, with minimum spacing
      const totalSpan = (n - 1) * MIN_LABEL_SPACING;
      const startX = from.x - totalSpan / 2;

      for (let i = 0; i < n; i++) {
        const edge = edges[sorted[i]];
        const w = Math.max(120, Math.min(200, edge.label.length * 16));
        labelPosMap.set(sorted[i], { x: startX + i * MIN_LABEL_SPACING, y: baseY, width: w });
      }
    }
  }

  return (
    <svg style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 0,
    }}>
      <style>{`
        g.edge-label:hover rect { fill: #2a2a3e; stroke: #7788bb; }
        g.edge-label:hover text { fill: #ccddff; }
      `}</style>
      {edges.map((edge, i) => {
        const { from, to } = edge;
        const x1 = from.x;
        const y1 = from.y + from.height / 2;
        const x2 = to.x;
        const y2 = to.y - to.height / 2;
        const lp = labelPosMap.get(i)!;
        const labelX = lp.x;
        const labelY = lp.y;
        const labelWidth = lp.width;

        return (
          <g key={i}>
            {/* Line: parent → label (top half) */}
            <line
              x1={x1} y1={y1} x2={x1} y2={labelY - 19}
              stroke="#555"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              opacity={0.5}
              pointerEvents="none"
            />
            {/* Line: label → child (bottom half) */}
            <line
              x1={x2} y1={labelY + 19} x2={x2} y2={y2}
              stroke="#555"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              opacity={0.5}
              pointerEvents="none"
            />
            <g
              className="edge-label"
              onClick={edge.onLabelClick}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={labelX - labelWidth / 2}
                y={labelY - 17}
                width={labelWidth}
                height={34}
                rx={5}
                fill="#1a1a28"
                stroke="#444"
                strokeWidth={1}
                opacity={0.92}
              />
              <text
                x={labelX}
                y={labelY + 5}
                textAnchor="middle"
                fill="#8899cc"
                fontSize="14"
                fontFamily='"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif'
              >
                {edge.label}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
