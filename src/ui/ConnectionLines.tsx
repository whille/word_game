// ui/ConnectionLines.tsx — SVG chalk lines connecting nodes.
import type { LayoutNode } from '../engine/types';

interface Edge {
  from: LayoutNode;
  to: LayoutNode;
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
      pointerEvents: 'none',
      zIndex: 0,
    }}>
      {edges.map((edge, i) => {
        const { from, to } = edge;
        return (
          <line
            key={i}
            x1={from.x}
            y1={from.y + from.height / 2}
            x2={to.x}
            y2={to.y - to.height / 2}
            stroke="#555"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            opacity={0.6}
          />
        );
      })}
    </svg>
  );
}
