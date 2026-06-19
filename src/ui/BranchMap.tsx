// ui/BranchMap.tsx — Mini tree map showing visited branches + current position.
// Click visited nodes to jump, unexplored branches shown as dashed.
import { useMemo } from 'react';
import dagre from 'dagre';
import { useGameStore } from '../store/gameStore';
import type { LayoutNode } from '../engine/types';

const NODE_W = 80;
const NODE_H = 40;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function BranchMap({ isOpen, onClose }: Props) {
  const evaluator = useGameStore(s => s.getEvaluator());
  const visitedNodes = useGameStore(s => s.visitedNodes);
  const currentNodeId = useGameStore(s => s.currentNodeId);
  const expandedNodes = useGameStore(s => s.expandedNodes);
  const clickNode = useGameStore(s => s.clickNode);

  const layout = useMemo(() => {
    if (!evaluator) return { nodes: [], edges: [] as { from: LayoutNode; to: LayoutNode; visited: boolean }[] };

    const level = evaluator.getLevel();
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 20, ranksep: 60, marginx: 16, marginy: 16 });
    g.setDefaultEdgeLabel(() => ({}));

    // Add all visited + current nodes
    const renderedNodes = level.nodes.filter(n =>
      visitedNodes.has(n.id) || n.id === currentNodeId || expandedNodes.has(n.id),
    );

    for (const node of renderedNodes) {
      g.setNode(node.id, { width: NODE_W, height: NODE_H });
      for (const child of node.children) {
        if (renderedNodes.some(rn => rn.id === child.targetId)) {
          g.setEdge(node.id, child.targetId);
        }
      }
    }

    dagre.layout(g);

    const layoutNodes: LayoutNode[] = [];
    for (const rn of renderedNodes) {
      const pos = g.node(rn.id);
      if (pos) {
        layoutNodes.push({
          nodeId: rn.id,
          x: pos.x,
          y: pos.y,
          width: NODE_W,
          height: NODE_H,
        });
      }
    }

    // Build edges
    const edges: { from: LayoutNode; to: LayoutNode; visited: boolean }[] = [];
    for (const rn of renderedNodes) {
      const from = layoutNodes.find(ln => ln.nodeId === rn.id);
      if (!from) continue;
      for (const child of rn.children) {
        const to = layoutNodes.find(ln => ln.nodeId === child.targetId);
        if (to) {
          edges.push({ from, to, visited: visitedNodes.has(child.targetId) });
        }
      }
    }

    return { nodes: layoutNodes, edges };
  }, [evaluator, visitedNodes, currentNodeId, expandedNodes]);

  if (!isOpen) return null;

  const bounds = (() => {
    if (layout.nodes.length === 0) return { w: 200, h: 160 };
    const minX = Math.min(...layout.nodes.map(n => n.x));
    const maxX = Math.max(...layout.nodes.map(n => n.x + n.width));
    const minY = Math.min(...layout.nodes.map(n => n.y));
    const maxY = Math.max(...layout.nodes.map(n => n.y + n.height));
    return { w: maxX - minX + 40, h: maxY - minY + 40 };
  })();

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 25 }}
      />
      <div style={{
        position: 'fixed',
        top: '48px',
        right: '12px',
        zIndex: 26,
        background: '#12121c',
        border: '1px solid #2a2a35',
        borderRadius: '8px',
        padding: '10px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          color: '#666',
          fontSize: '11px',
          marginBottom: '6px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>🗺️ 分支地图</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '13px' }}
          >
            ✕
          </button>
        </div>
        <svg
          width={Math.min(bounds.w, 260)}
          height={Math.min(bounds.h, 200)}
          style={{ display: 'block' }}
        >
          {/* Edges */}
          {layout.edges.map((edge, i) => (
            <line
              key={`e-${i}`}
              x1={edge.from.x + NODE_W / 2}
              y1={edge.from.y + NODE_H}
              x2={edge.to.x + NODE_W / 2}
              y2={edge.to.y}
              stroke={edge.visited ? '#444' : '#333'}
              strokeWidth={1}
              strokeDasharray={edge.visited ? 'none' : '4 3'}
              opacity={edge.visited ? 0.6 : 0.3}
            />
          ))}

          {/* Nodes */}
          {layout.nodes.map(ln => {
            const isCurrent = ln.nodeId === currentNodeId;
            const isVisited = visitedNodes.has(ln.nodeId);
            const node = evaluator?.getNode(ln.nodeId);
            const label = node ? node.content.slice(0, 6) : ln.nodeId;

            return (
              <g
                key={ln.nodeId}
                onClick={() => {
                  if (isVisited || isCurrent) {
                    clickNode(ln.nodeId);
                    onClose();
                  }
                }}
                style={{ cursor: isVisited || isCurrent ? 'pointer' : 'default' }}
              >
                <rect
                  x={ln.x}
                  y={ln.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={4}
                  fill={isCurrent ? '#2a2a18' : isVisited ? '#181824' : '#14141c'}
                  stroke={isCurrent ? '#ffd700' : isVisited ? '#444' : '#2a2a30'}
                  strokeWidth={isCurrent ? 1.5 : 1}
                  opacity={isVisited ? 0.7 : 0.4}
                />
                <text
                  x={ln.x + NODE_W / 2}
                  y={ln.y + NODE_H / 2 + 4}
                  textAnchor="middle"
                  fill={isCurrent ? '#ffd700' : isVisited ? '#777' : '#444'}
                  fontSize="10"
                  fontFamily='"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif'
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
        <div style={{ color: '#444', fontSize: '10px', textAlign: 'center', marginTop: '4px' }}>
          点击节点快速跳转
        </div>
      </div>
    </>
  );
}
