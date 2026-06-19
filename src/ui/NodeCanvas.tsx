// ui/NodeCanvas.tsx — Renders the node tree with dagre layout.
// Computes positions, renders NodeCards and ConnectionLines,
// and shows connection options for the current node.
import { useMemo } from 'react';
import dagre from 'dagre';
import { useGameStore } from '../store/gameStore';
import { NodeCard } from './NodeCard';
import { ConnectionLines } from './ConnectionLines';
import type { LayoutNode, Connection } from '../engine/types';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 100;

interface NodeCanvasProps {
  selectedItemId: string | null;
  onItemUse: (itemId: string, nodeId: string) => void;
  onItemDeselect: () => void;
}

export function NodeCanvas({ selectedItemId, onItemUse, onItemDeselect }: NodeCanvasProps) {
  const evaluator = useGameStore(s => s.getEvaluator());
  const expandedNodes = useGameStore(s => s.expandedNodes);
  const currentNodeId = useGameStore(s => s.currentNodeId);
  const selectConnection = useGameStore(s => s.selectConnection);
  const clickNode = useGameStore(s => s.clickNode);

  // Compute layout
  const { layoutNodes, edges } = useMemo(() => {
    if (!evaluator) return { layoutNodes: [], edges: [] };

    const level = evaluator.getLevel();
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 120, marginx: 40, marginy: 40 });
    g.setDefaultEdgeLabel(() => ({}));

    for (const node of level.nodes) {
      if (!expandedNodes.has(node.id)) continue;
      const w = node.position ? NODE_WIDTH : NODE_WIDTH;
      const h = NODE_HEIGHT;
      g.setNode(node.id, { width: w, height: h });
      if (node.position) {
        g.node(node.id).x = node.position.x;
        g.node(node.id).y = node.position.y;
      }

      // Add edges to expanded children
      for (const child of node.children) {
        if (expandedNodes.has(child.targetId)) {
          g.setEdge(node.id, child.targetId);
        }
      }
    }

    // Only run layout if there are nodes without manual positions
    const hasAutoNodes = level.nodes.some(
      n => expandedNodes.has(n.id) && !n.position,
    );
    if (hasAutoNodes) {
      dagre.layout(g);
    }

    const layoutNodes: LayoutNode[] = [];
    for (const node of level.nodes) {
      if (!expandedNodes.has(node.id)) continue;
      const pos = g.node(node.id);
      if (pos) {
        layoutNodes.push({
          nodeId: node.id,
          x: pos.x,
          y: pos.y,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        });
      }
    }

    // Build edges for rendering
    const edges = [];
    for (const node of level.nodes) {
      if (!expandedNodes.has(node.id)) continue;
      const from = layoutNodes.find(ln => ln.nodeId === node.id);
      if (!from) continue;
      for (const child of node.children) {
        if (!expandedNodes.has(child.targetId)) continue;
        const to = layoutNodes.find(ln => ln.nodeId === child.targetId);
        if (to) edges.push({ from, to });
      }
    }

    return { layoutNodes, edges };
  }, [evaluator, expandedNodes]);

  // Compute valid target nodes for selected item
  const validTargets = useMemo(() => {
    if (!selectedItemId || !evaluator) return new Set<string>();
    const level = evaluator.getLevel();
    const item = level.items.find(i => i.id === selectedItemId);
    if (!item) return new Set<string>();
    return new Set(item.usableOn);
  }, [selectedItemId, evaluator]);

  // Current node data
  const currentNode = evaluator?.getNode(currentNodeId);
  const visibleConnections: Connection[] = currentNode
    ? evaluator!.getVisibleChildren(currentNodeId, useGameStore.getState())
    : [];

  // Find SVG bounds
  const bounds = useMemo(() => {
    if (layoutNodes.length === 0) return { width: 800, height: 600 };
    const minX = Math.min(...layoutNodes.map(n => n.x - n.width / 2));
    const maxX = Math.max(...layoutNodes.map(n => n.x + n.width / 2));
    const minY = Math.min(...layoutNodes.map(n => n.y - n.height / 2));
    const maxY = Math.max(...layoutNodes.map(n => n.y + n.height / 2));
    return {
      width: Math.max(800, maxX - minX + 200),
      height: Math.max(600, maxY - minY + 300),
    };
  }, [layoutNodes]);

  if (!evaluator) {
    return <div style={{ padding: '2rem', color: '#aaa' }}>加载关卡中...</div>;
  }

  return (
    <div style={{
      flex: 1,
      overflow: 'auto',
      position: 'relative',
      background: '#0a0a0a',
      minHeight: '400px',
    }}>
      <div style={{
        position: 'relative',
        width: bounds.width,
        height: bounds.height,
        minWidth: '100%',
      }}>
        <ConnectionLines edges={edges} />

        {layoutNodes.map(ln => {
          const node = evaluator.getLevel().nodes.find(n => n.id === ln.nodeId);
          if (!node) return null;
          const isTarget = validTargets.has(ln.nodeId);
          return (
            <NodeCard
              key={ln.nodeId}
              nodeId={ln.nodeId}
              content={node.content}
              type={node.type}
              x={ln.x}
              y={ln.y}
              isCurrent={ln.nodeId === currentNodeId}
              isExpanded={expandedNodes.has(ln.nodeId)}
              isValidTarget={isTarget}
              onClick={() => {
                if (selectedItemId && isTarget) {
                  onItemUse(selectedItemId, ln.nodeId);
                  onItemDeselect();
                } else {
                  clickNode(ln.nodeId);
                }
              }}
            />
          );
        })}

        {/* Connection options for current node */}
        {visibleConnections.length > 0 && (
          <div style={{
            position: 'absolute',
            left: (layoutNodes.find(ln => ln.nodeId === currentNodeId)?.x ?? 400) + NODE_WIDTH / 2 + 30,
            top: layoutNodes.find(ln => ln.nodeId === currentNodeId)?.y ?? 300,
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 5,
          }}>
            {visibleConnections.map((conn, idx) => (
              <button
                key={idx}
                onClick={() => selectConnection(idx)}
                style={{
                  padding: '8px 16px',
                  background: '#1a1a2e',
                  color: '#7ec8e3',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.2s, border-color 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#222244';
                  e.currentTarget.style.borderColor = '#4488ff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#1a1a2e';
                  e.currentTarget.style.borderColor = '#333';
                }}
              >
                {conn.label}
                {conn.cost && (
                  <span style={{ fontSize: '10px', color: '#888', marginLeft: '8px' }}>
                    {conn.cost.hp ? `生命${conn.cost.hp > 0 ? '+' : ''}${conn.cost.hp}` : ''}
                    {conn.cost.sanity ? ` 理智${conn.cost.sanity > 0 ? '+' : ''}${conn.cost.sanity}` : ''}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
