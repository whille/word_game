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
        // Label at fixed Y offset from parent → all options from same parent align horizontally
        const LABEL_Y_OFFSET = 70;
        const labelY = y1 + LABEL_Y_OFFSET;
        const labelX = (x1 + x2) / 2;

        // Measure approximate label width for column sizing
        const labelWidth = Math.max(120, Math.min(200, edge.label.length * 16));

        return (
          <g key={i}>
            {/* Line: parent → label row → child (elbow connector) */}
            <polyline
              points={`${x1},${y1} ${x1},${labelY} ${labelX},${labelY} ${x2},${labelY} ${x2},${y2}`}
              fill="none"
              stroke="#444"
              strokeWidth={1.2}
              strokeDasharray="5 4"
              opacity={0.45}
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
