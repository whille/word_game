// ui/NodeCanvas.tsx — Tree overview with dagre layout + mouse drag panning.
import { useMemo, useRef, useState, useCallback } from 'react';
import dagre from 'dagre';
import { useGameStore } from '../store/gameStore';
import { NodeCard } from './NodeCard';
import { ConnectionLines } from './ConnectionLines';
import type { LayoutNode } from '../engine/types';

const NODE_WIDTH = 260;
const NODE_HEIGHT = 120;

interface NodeCanvasProps {
  selectedItemId: string | null;
  onItemUse: (itemId: string, nodeId: string) => void;
  onItemDeselect: () => void;
}

export function NodeCanvas({ selectedItemId, onItemUse, onItemDeselect }: NodeCanvasProps) {
  const evaluator = useGameStore(s => s.getEvaluator());
  const expandedNodes = useGameStore(s => s.expandedNodes);
  const currentNodeId = useGameStore(s => s.currentNodeId);
  const clickNode = useGameStore(s => s.clickNode);
  const toggleNodeCollapse = useGameStore(s => s.toggleNodeCollapse);
  const visitedNodes = useGameStore(s => s.visitedNodes);

  // Nodes that are children of the current node — styled as "options"
  const optionNodeIds = useMemo(() => {
    if (!evaluator || !currentNodeId) return new Set<string>();
    const node = evaluator.getNode(currentNodeId);
    if (!node) return new Set<string>();
    const visible = evaluator.getVisibleChildren(currentNodeId, useGameStore.getState());
    return new Set(visible.map(c => c.targetId));
  }, [evaluator, currentNodeId]);

  // ---- Drag-to-pan state ----
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, scrollX: 0, scrollY: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start drag on left button, not on node cards (those are clicks)
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // Don't start drag if clicking on a node card or button
    if (target.closest('[data-node-card]') || target.closest('button')) return;

    const el = scrollRef.current;
    if (!el) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, scrollX: el.scrollLeft, scrollY: el.scrollTop };
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    el.scrollLeft = dragStart.current.scrollX - dx;
    el.scrollTop = dragStart.current.scrollY - dy;
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ---- Compute layout ----
  const { layoutNodes, edges: edgesWithLabels } = useMemo(() => {
    if (!evaluator) return { layoutNodes: [], edges: [] };

    const level = evaluator.getLevel();
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 70, ranksep: 140, marginx: 50, marginy: 50 });
    g.setDefaultEdgeLabel(() => ({}));

    for (const node of level.nodes) {
      if (!expandedNodes.has(node.id)) continue;
      g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
      if (node.position) {
        g.node(node.id).x = node.position.x;
        g.node(node.id).y = node.position.y;
      }
      for (const child of node.children) {
        if (expandedNodes.has(child.targetId)) {
          g.setEdge(node.id, child.targetId);
        }
      }
    }

    const hasAutoNodes = level.nodes.some(
      n => expandedNodes.has(n.id) && !n.position,
    );
    if (hasAutoNodes) dagre.layout(g);

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

    const edges: { from: LayoutNode; to: LayoutNode; label: string; targetId: string }[] = [];
    for (const node of level.nodes) {
      if (!expandedNodes.has(node.id)) continue;
      const from = layoutNodes.find(ln => ln.nodeId === node.id);
      if (!from) continue;
      for (const child of node.children) {
        if (!expandedNodes.has(child.targetId)) continue;
        const to = layoutNodes.find(ln => ln.nodeId === child.targetId);
        if (to) {
          edges.push({ from, to, label: child.label, targetId: child.targetId });
        }
      }
    }

    return { layoutNodes, edges };
  }, [evaluator, expandedNodes]);

  // Compute valid targets for selected item
  const validTargets = useMemo(() => {
    if (!selectedItemId || !evaluator) return new Set<string>();
    const item = evaluator.getLevel().items.find(i => i.id === selectedItemId);
    return item ? new Set(item.usableOn) : new Set();
  }, [selectedItemId, evaluator]);

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
    return <div style={{ padding: '2rem', color: '#aaa', textAlign: 'center' }}>加载关卡中...</div>;
  }

  return (
    <div
      ref={scrollRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        flex: 1,
        overflow: 'auto',
        position: 'relative',
        background: `
          #0a0a0a
          linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        minHeight: '300px',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
    >
      <div style={{
        position: 'relative',
        width: bounds.width,
        height: bounds.height,
        minWidth: '100%',
        pointerEvents: isDragging ? 'none' : 'auto',
      }}>
        <ConnectionLines edges={edgesWithLabels.map(e => ({
            from: e.from,
            to: e.to,
            label: e.label,
            onLabelClick: () => {
              if (selectedItemId && validTargets.has(e.targetId)) {
                onItemUse(selectedItemId, e.targetId);
                onItemDeselect();
              } else {
                clickNode(e.targetId);
              }
            },
          }))} />

        {layoutNodes.map(ln => {
          const node = evaluator.getLevel().nodes.find(n => n.id === ln.nodeId);
          if (!node) return null;

          const isTarget = validTargets.has(ln.nodeId);
          const isCurrent = ln.nodeId === currentNodeId;
          const isOption = optionNodeIds.has(ln.nodeId);
          const isVisited = visitedNodes.has(ln.nodeId);

          // Only render: current, visited, or option nodes
          if (!isCurrent && !isVisited && !isOption) return null;

          const hasExpandedChildren = node.children.some(c => expandedNodes.has(c.targetId));
          return (
            <NodeCard
              key={ln.nodeId}
              nodeId={ln.nodeId}
              content={node.content}
              type={node.type}
              x={ln.x}
              y={ln.y}
              isCurrent={isCurrent}
              isExpanded={expandedNodes.has(ln.nodeId)}
              isValidTarget={isTarget}
              hasExpandedChildren={hasExpandedChildren}
              isOption={isOption}
              onClick={() => {
                if (isDragging) return;
                if (selectedItemId && isTarget) {
                  onItemUse(selectedItemId, ln.nodeId);
                  onItemDeselect();
                } else if (isCurrent && node.children.length > 0) {
                  toggleNodeCollapse(ln.nodeId);
                } else {
                  clickNode(ln.nodeId);
                }
              }}
            />
          );
        })}

        {/* Drag hint — shown briefly on empty canvas */}
        {layoutNodes.length <= 2 && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#444',
            fontSize: '12px',
            pointerEvents: 'none',
          }}>
            🖱️ 拖拽可移动画布
          </div>
        )}
      </div>
    </div>
  );
}
