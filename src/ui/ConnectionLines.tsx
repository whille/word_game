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
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;

        return (
          <g key={i}>
            <line
              x1={x1} y1={y1} x2={x2} y2={y2}
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
                x={mx - 80}
                y={my - 17}
                width={160}
                height={34}
                rx={5}
                fill="#1a1a28"
                stroke="#444"
                strokeWidth={1}
                opacity={0.92}
              />
              <text
                x={mx}
                y={my + 5}
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
