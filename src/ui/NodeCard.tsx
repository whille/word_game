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
  isValidTarget: boolean;
  hasExpandedChildren: boolean;
  onClick: () => void;
}

export function NodeCard({ nodeId, content, type, x, y, isCurrent, isExpanded: _isExpanded, isValidTarget, hasExpandedChildren, onClick }: NodeCardProps) {
  const isVisited = useGameStore(s => s.visitedNodes.has(nodeId));

  const style = useMemo(() => {
    const animClass = animationForType(type);
    // Determine border: gold for current, green pulse for valid item target
    let border = '2px solid transparent';
    let boxShadow = 'none';
    if (isCurrent) {
      border = '2px solid #ffd700';
      boxShadow = '0 0 12px rgba(255, 215, 0, 0.3)';
    } else if (isValidTarget) {
      border = '2px solid #44cc88';
      boxShadow = '0 0 10px rgba(68, 204, 136, 0.25)';
    }

    return {
      position: 'absolute' as const,
      left: x,
      top: y,
      transform: 'translate(-50%, -50%)',
      maxWidth: '260px',
      padding: '14px 20px',
      borderRadius: '8px',
      cursor: 'pointer',
      opacity: isVisited && !isCurrent ? 0.45 : 1,
      border,
      background: bgForType(type),
      color: colorForType(type),
      fontSize: '16px',
      lineHeight: '1.8',
      transition: 'opacity 0.3s, border-color 0.3s, box-shadow 0.3s',
      boxShadow: isValidTarget && !isCurrent ? '0 0 10px rgba(68, 204, 136, 0.25)' : boxShadow,
      userSelect: 'none' as const,
      zIndex: isCurrent ? 2 : 1,
      animation: isValidTarget ? `${animClass}, box-horror-pulse 2s infinite` : animClass,
    };
  }, [x, y, isCurrent, isVisited, type, isValidTarget]);

  return (
    <div data-node-card style={style} onClick={onClick}>
      <NodeIcon type={type} />
      <NodeContent content={content} isCurrent={isCurrent} isVisited={isVisited} />
      {/* Toggle indicator — only on current node with children */}
      {isCurrent && (
        <span style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: hasExpandedChildren ? '#333' : '#1a2a1a',
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

function NodeContent({ content, isCurrent, isVisited }: { content: string; isCurrent: boolean; isVisited: boolean }) {
  // Hide unvisited node content in tree to avoid spoiling choices
  const displayText = isVisited || isCurrent ? content : '???';
  return (
    <span style={{
      color: isCurrent ? '#fff' : isVisited ? '#ccc' : '#555',
      fontStyle: isVisited || isCurrent ? 'normal' : 'italic',
    }}>
      {displayText}
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

/** CSS animation string applied based on node type for horror atmosphere. */
function animationForType(type: NodeType): string {
  switch (type) {
    case 'clue':
      // Clue text flickers — unstable, partially hidden truth
      return 'text-flicker 4s infinite';
    case 'monster':
      // Monster nodes shake + red pulse background
      return 'text-shake 0.4s ease-in-out, box-horror-pulse 3s infinite';
    case 'action':
      // Action nodes have subtle golden glow — items of power
      return 'text-glow-pulse 4s infinite';
    case 'ending':
      // Ending nodes blur and color-shift — reality breaking
      return 'text-blur 6s infinite, text-color-shift 8s infinite';
    default:
      return 'none';
  }
}
