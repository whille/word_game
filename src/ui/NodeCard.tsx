// ui/NodeCard.tsx — Clickable text node. Three visual modes:
// 1. current: gold glow, prominent
// 2. option: child of current node, dashed border, arrow icon — "clickable choice"
// 3. visited: dimmed, normal card
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
  isValidTarget: boolean;
  hasExpandedChildren: boolean;
  isOption: boolean; // child of current node — styled as a clickable choice
  onClick: () => void;
}

export function NodeCard({
  nodeId, content, type, x, y, isCurrent, isExpanded: _isExpanded,
  isValidTarget, hasExpandedChildren, isOption, onClick,
}: NodeCardProps) {
  const isVisited = useGameStore(s => s.visitedNodes.has(nodeId));

  const style = useMemo(() => {
    const animClass = animationForType(type);

    // Border & shadow logic
    let border: string;
    let boxShadow: string;
    if (isCurrent) {
      border = '2px solid #ffd700';
      boxShadow = '0 0 16px rgba(255, 215, 0, 0.35)';
    } else if (isValidTarget) {
      border = '2px solid #44cc88';
      boxShadow = '0 0 10px rgba(68, 204, 136, 0.25)';
    } else if (isOption) {
      border = '1.5px dashed #666';
      boxShadow = 'none';
    } else {
      border = '2px solid transparent';
      boxShadow = 'none';
    }

    return {
      position: 'absolute' as const,
      left: x,
      top: y,
      transform: 'translate(-50%, -50%)',
      maxWidth: isCurrent ? '300px' : '240px',
      padding: isCurrent ? '16px 22px' : '12px 16px',
      borderRadius: '8px',
      cursor: 'pointer',
      opacity: isVisited && !isCurrent && !isOption ? 0.45 : 1,
      border,
      background: isOption ? '#12121c' : bgForType(type),
      color: colorForType(type),
      fontSize: isCurrent ? '18px' : isOption ? '14px' : '15px',
      lineHeight: '1.8',
      transition: 'opacity 0.3s, border-color 0.3s, box-shadow 0.3s, max-width 0.3s, padding 0.3s, font-size 0.3s',
      boxShadow,
      userSelect: 'none' as const,
      zIndex: isCurrent ? 3 : isOption ? 2 : 1,
      animation: isValidTarget ? `${animClass}, box-horror-pulse 2s infinite` : animClass,
    };
  }, [x, y, isCurrent, isVisited, type, isValidTarget, isOption]);

  return (
    <div data-node-card style={style} onClick={onClick}>
      {/* Option arrow */}
      {isOption && (
        <span style={{
          position: 'absolute',
          left: '-10px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#888',
          fontSize: '12px',
        }}>
          ▸
        </span>
      )}
      <NodeIcon type={type} />
      <NodeContent content={content} isCurrent={isCurrent} isOption={isOption} />
      {/* Toggle indicator on current node */}
      {isCurrent && (
        <span style={{
          position: 'absolute',
          top: '-10px',
          right: '-10px',
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: hasExpandedChildren ? '#2a2a2a' : '#1a2a1a',
          border: hasExpandedChildren ? '1px solid #888' : '1px solid #44aa66',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          color: hasExpandedChildren ? '#aaa' : '#44cc88',
          cursor: 'pointer',
          lineHeight: 1,
        }}>
          {hasExpandedChildren ? '−' : '+'}
        </span>
      )}
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

function NodeContent({ content, isCurrent, isOption }: {
  content: string; isCurrent: boolean; isOption: boolean;
}) {
  return (
    <span style={{
      color: isCurrent ? '#fff' : isOption ? '#aab' : '#ccc',
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

function animationForType(type: NodeType): string {
  switch (type) {
    case 'clue': return 'text-flicker 4s infinite';
    case 'monster': return 'text-shake 0.4s ease-in-out, box-horror-pulse 3s infinite';
    case 'action': return 'text-glow-pulse 4s infinite';
    case 'ending': return 'text-blur 6s infinite, text-color-shift 8s infinite';
    default: return 'none';
  }
}
