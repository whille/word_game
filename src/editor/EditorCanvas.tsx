// editor/EditorCanvas.tsx — Interactive tree editor with dagre layout.
// Nodes are draggable; click to select; double-click canvas to add a node.
import { useMemo, useRef, useState, useCallback } from 'react';
import dagre from 'dagre';
import { useEditorStore } from './EditorStore';
import type { LayoutNode, NodeDef } from '../engine/types';

const NODE_W = 220;
const NODE_H = 80;

export function EditorCanvas() {
  const level = useEditorStore(s => s.level);
  const selectedType = useEditorStore(s => s.selectedType);
  const selectedId = useEditorStore(s => s.selectedId);
  const select = useEditorStore(s => s.select);
  const updateNode = useEditorStore(s => s.updateNode);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const dragStart = useRef({ x: 0, y: 0, nodeX: 0, nodeY: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // ── Layout (dagre) ──
  const { layoutNodes, edges } = useMemo(() => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 200, marginx: 80, marginy: 80 });
    g.setDefaultEdgeLabel(() => ({}));

    for (const node of level.nodes) {
      g.setNode(node.id, { width: NODE_W, height: NODE_H });
      if (node.position) {
        g.node(node.id).x = node.position.x;
        g.node(node.id).y = node.position.y;
      }
      for (const child of node.children) {
        g.setEdge(node.id, child.targetId);
      }
    }

    dagre.layout(g);

    const layoutNodes: LayoutNode[] = level.nodes.map(n => {
      const pos = g.node(n.id);
      return {
        nodeId: n.id,
        x: pos?.x ?? 0,
        y: pos?.y ?? 0,
        width: NODE_W,
        height: NODE_H,
      };
    });

    const edgeList: { from: LayoutNode; to: LayoutNode; label: string }[] = [];
    for (const node of level.nodes) {
      const from = layoutNodes.find(ln => ln.nodeId === node.id);
      if (!from) continue;
      for (const child of node.children) {
        const to = layoutNodes.find(ln => ln.nodeId === child.targetId);
        if (to) edgeList.push({ from, to, label: child.label });
      }
    }

    return { layoutNodes, edges: edgeList };
  }, [level.nodes]);

  // ── Bounds ──
  const bounds = useMemo(() => {
    if (layoutNodes.length === 0) return { w: 1200, h: 800 };
    const minX = Math.min(...layoutNodes.map(n => n.x));
    const maxX = Math.max(...layoutNodes.map(n => n.x));
    const minY = Math.min(...layoutNodes.map(n => n.y));
    const maxY = Math.max(...layoutNodes.map(n => n.y));
    return { w: Math.max(1200, maxX - minX + 400), h: Math.max(800, maxY - minY + 400) };
  }, [layoutNodes]);

  // ── Drag Node ──
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const ln = layoutNodes.find(n => n.nodeId === nodeId);
    if (!ln) return;
    select('node', nodeId);
    setIsDragging(true);
    setDragNodeId(nodeId);
    dragStart.current = { x: e.clientX, y: e.clientY, nodeX: ln.x, nodeY: ln.y };
  }, [layoutNodes, select]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragNodeId) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    updateNode(dragNodeId, {
      position: { x: dragStart.current.nodeX + dx, y: dragStart.current.nodeY + dy },
    });
  }, [isDragging, dragNodeId, updateNode]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragNodeId(null);
  }, []);

  // ── Canvas click ──
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target !== canvasRef.current) return;
    if (isDragging) return;
    select('node', '');
  }, [isDragging, select]);

  // ── Color by type ──
  const nodeStyle = (node: NodeDef, ln: LayoutNode) => {
    const isSelected = selectedType === 'node' && selectedId === node.id;
    let bg = '#1a1a28';
    let border = isSelected ? '2px solid #ffd700' : '1px solid #333';
    let color = '#ccc';

    switch (node.type) {
      case 'start': bg = '#1a281a'; border = isSelected ? '2px solid #ffd700' : '1px solid #2a4a2a'; break;
      case 'clue': bg = '#1a1a2e'; border = isSelected ? '2px solid #ffd700' : '1px solid #2a2a4a'; break;
      case 'action': bg = '#281a1a'; border = isSelected ? '2px solid #ffd700' : '1px solid #4a2a2a'; break;
      case 'monster': bg = '#281a1a'; color = '#ff8888'; border = isSelected ? '2px solid #ffd700' : '1px solid #4a2020'; break;
      case 'ending': bg = '#1a1a1a'; color = '#888'; border = isSelected ? '2px solid #ffd700' : '1px solid #2a2a2a'; break;
      case 'choice': bg = '#1a1a28'; break;
    }

    return {
      position: 'absolute' as const,
      left: ln.x, top: ln.y,
      transform: 'translate(-50%, -50%)',
      width: NODE_W, padding: '8px 14px',
      borderRadius: '6px',
      cursor: isDragging && dragNodeId === node.id ? 'grabbing' : 'grab',
      background: bg,
      border,
      color,
      fontSize: '12px',
      lineHeight: 1.6,
      maxHeight: NODE_H,
      overflow: 'hidden',
      boxShadow: isSelected ? '0 0 12px rgba(255,215,0,0.25)' : 'none',
      zIndex: isSelected ? 10 : 1,
      userSelect: 'none' as const,
    };
  };

  return (
    <div ref={scrollRef} style={{
      width: '100%', height: '100%',
      overflow: 'auto',
      background: '#06060c',
      backgroundImage: 'linear-gradient(rgba(255,255,255,0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.01) 1px, transparent 1px)',
      backgroundSize: '40px 40px',
    }}>
      <div ref={canvasRef} onClick={handleCanvasClick}
        onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        style={{ position: 'relative', width: bounds.w, height: bounds.h, minWidth: '100%' }}>

        {/* Edge lines */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
          {edges.map((e, i) => {
            const y1 = e.from.y + NODE_H / 2;
            const y2 = e.to.y - NODE_H / 2;
            return (
              <g key={i}>
                <line x1={e.from.x} y1={y1} x2={e.to.x} y2={y2}
                  stroke="#444" strokeWidth={1.5} strokeDasharray="6 4" pointerEvents="none" />
                <text x={(e.from.x + e.to.x) / 2} y={(y1 + y2) / 2}
                  textAnchor="middle" fill="#555" fontSize="10"
                  fontFamily="'PingFang SC',sans-serif">
                  {e.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {layoutNodes.map(ln => {
          const node = level.nodes.find(n => n.id === ln.nodeId);
          if (!node) return null;
          const tag = typeTag(node.type);
          return (
            <div key={node.id}
              onMouseDown={e => handleNodeMouseDown(e, node.id)}
              style={nodeStyle(node, ln)}>
              <span style={{ fontSize: '10px', color: '#555', fontWeight: 'bold' }}>{tag}</span>
              <span style={{ marginLeft: '6px' }}>{node.content.slice(0, 60) || '(空)'}</span>
              {node.children.length > 0 && (
                <span style={{ float: 'right', color: '#555', fontSize: '10px' }}>{node.children.length}→</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function typeTag(type: string): string {
  switch (type) {
    case 'start': return '起始';
    case 'choice': return '选择';
    case 'clue': return '线索';
    case 'action': return '行动';
    case 'monster': return '怪物';
    case 'ending': return '结局';
    default: return type;
  }
}
