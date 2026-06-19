// ui/NodeCard.tsx — Clickable text node with type icon and CSS effects.
import { useGameStore } from '../store/gameStore';
import type { NodeType } from '../engine/types';
import { useMemo } from 'react';

interface NodeCardProps {
  nodeId: string;
  content: string;
  type: NodeType;
  x: number;
  y: number;
  isCurrent: boolean;
  isExpanded: boolean;
  onClick: () => void;
}

export function NodeCard({ nodeId, content, type, x, y, isCurrent, isExpanded: _isExpanded, onClick }: NodeCardProps) {
  const isVisited = useGameStore(s => s.visitedNodes.has(nodeId));

  const style = useMemo(() => ({
    position: 'absolute' as const,
    left: x,
    top: y,
    transform: 'translate(-50%, -50%)',
    maxWidth: '200px',
    padding: '12px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    opacity: isVisited && !isCurrent ? 0.5 : 1,
    border: isCurrent ? '2px solid #ffd700' : '2px solid transparent',
    background: bgForType(type),
    color: colorForType(type),
    fontSize: '14px',
    lineHeight: '1.6',
    transition: 'opacity 0.3s, border-color 0.3s, box-shadow 0.3s',
    boxShadow: isCurrent ? '0 0 12px rgba(255, 215, 0, 0.3)' : 'none',
    userSelect: 'none' as const,
    zIndex: isCurrent ? 2 : 1,
  }), [x, y, isCurrent, isVisited, type]);

  return (
    <div style={style} onClick={onClick}>
      <NodeIcon type={type} />
      <NodeContent content={content} isCurrent={isCurrent} />
    </div>
  );
}

function NodeIcon({ type }: { type: NodeType }) {
  const icon = {
    start: '▶',
    choice: '',
    clue: '🔍 ',
    action: '🔧 ',
    monster: '🩸 ',
    ending: '⏹ ',
  }[type];

  if (!icon) return null;
  return <span style={{ fontSize: '11px', marginRight: '2px' }}>{icon}</span>;
}

function NodeContent({ content, isCurrent }: { content: string; isCurrent: boolean }) {
  return (
    <span style={{
      color: isCurrent ? '#fff' : '#ccc',
    }}>
      {content}
    </span>
  );
}

function bgForType(type: NodeType): string {
  switch (type) {
    case 'start': return '#1a1a2e';
    case 'choice': return '#1a1a20';
    case 'clue': return '#1a1a24';
    case 'action': return '#1a201a';
    case 'monster': return '#2e1a1a';
    case 'ending': return '#0a0a0a';
    default: return '#1a1a2e';
  }
}

function colorForType(type: NodeType): string {
  switch (type) {
    case 'start': return '#e0e0e0';
    case 'choice': return '#ffeaa7';
    case 'clue': return '#dfe6e9';
    case 'action': return '#55efc4';
    case 'monster': return '#ff7675';
    case 'ending': return '#b2bec3';
    default: return '#e0e0e0';
  }
}
