// ui/ReadingPanel.tsx — Main text display. Shows current node content
// in large readable text with connection options as action buttons.
import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Connection, NodeType } from '../engine/types';

interface ReadingPanelProps {
  selectedItemId: string | null;
  onItemUse: (itemId: string, nodeId: string) => void;
  onItemDeselect: () => void;
}

export function ReadingPanel({ selectedItemId, onItemUse, onItemDeselect }: ReadingPanelProps) {
  const evaluator = useGameStore(s => s.getEvaluator());
  const currentNodeId = useGameStore(s => s.currentNodeId);
  const selectConnection = useGameStore(s => s.selectConnection);

  const node = evaluator?.getNode(currentNodeId);
  const visibleConnections: Connection[] = useMemo(() => {
    if (!evaluator || !currentNodeId) return [];
    return evaluator.getVisibleChildren(currentNodeId, useGameStore.getState());
  }, [evaluator, currentNodeId]);

  // Check valid targets for selected item
  const validTargets = useMemo(() => {
    if (!selectedItemId || !evaluator) return new Set<string>();
    const item = evaluator.getLevel().items.find(i => i.id === selectedItemId);
    return item ? new Set(item.usableOn) : new Set();
  }, [selectedItemId, evaluator]);

  if (!node) {
    return (
      <div style={{ padding: '2rem', color: '#666', textAlign: 'center' }}>
        选择起点...
      </div>
    );
  }

  return (
    <div style={{
      flex: '0 0 auto',
      padding: '24px 28px 16px',
      background: 'linear-gradient(180deg, #0d0d16 0%, #0a0a10 100%)',
      borderBottom: '1px solid #1a1a28',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      maxHeight: '50vh',
      overflow: 'auto',
    }}>
      {/* Type label */}
      <div style={{
        fontSize: '10px',
        color: typeColor(node.type),
        textTransform: 'uppercase',
        letterSpacing: '3px',
        opacity: 0.6,
      }}>
        {typeLabel(node.type)}
      </div>

      {/* Main content — large readable text */}
      <div style={{
        fontSize: '24px',
        lineHeight: '1.9',
        color: '#e8e0d0',
        fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Serif SC", serif',
        letterSpacing: '0.5px',
        animation: 'node-appear 0.3s ease-out',
        whiteSpace: 'pre-wrap',
      }}>
        {node.content}
      </div>

      {/* Narrative from onEnter */}
      {node.onEnter?.narrative && (
        <div style={{
          fontSize: '14px',
          color: '#8a8a7a',
          fontStyle: 'italic',
          borderLeft: '2px solid #333',
          paddingLeft: '12px',
          animation: 'text-flicker 4s infinite',
        }}>
          {node.onEnter.narrative}
        </div>
      )}

      {/* Connection options — action buttons */}
      {visibleConnections.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          marginTop: '4px',
        }}>
          {visibleConnections.map((conn, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (selectedItemId && validTargets.has(conn.targetId)) {
                  onItemUse(selectedItemId, conn.targetId);
                  onItemDeselect();
                } else {
                  selectConnection(idx);
                }
              }}
              style={{
                padding: '10px 22px',
                background: selectedItemId && validTargets.has(conn.targetId)
                  ? '#1a3a2a'
                  : '#151520',
                color: selectedItemId && validTargets.has(conn.targetId)
                  ? '#66dd99'
                  : '#c4c4b0',
                border: selectedItemId && validTargets.has(conn.targetId)
                  ? '1px solid #44aa66'
                  : '1px solid #2a2a35',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '17px',
                fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#1e1e2e';
                e.currentTarget.style.borderColor = '#5544aa';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = selectedItemId && validTargets.has(conn.targetId)
                  ? '#1a3a2a'
                  : '#151520';
                e.currentTarget.style.borderColor = selectedItemId && validTargets.has(conn.targetId)
                  ? '#44aa66'
                  : '#2a2a35';
              }}
            >
              <span style={{ fontSize: '14px', opacity: 0.5 }}>▸</span>
              {conn.label}
              {conn.cost && (
                <span style={{ fontSize: '11px', opacity: 0.5 }}>
                  {conn.cost.hp ? `${conn.cost.hp > 0 ? '+' : ''}${conn.cost.hp}❤️` : ''}
                  {conn.cost.sanity ? ` ${conn.cost.sanity > 0 ? '+' : ''}${conn.cost.sanity}🧠` : ''}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* No connections — reached an ending or leaf */}
      {visibleConnections.length === 0 && node.type !== 'ending' && (
        <div style={{ fontSize: '13px', color: '#666', textAlign: 'center', padding: '12px' }}>
          前方无路...
        </div>
      )}

      {/* Ending marker */}
      {node.type === 'ending' && (
        <div style={{
          fontSize: '10px',
          color: '#8b0000',
          textTransform: 'uppercase',
          letterSpacing: '4px',
          textAlign: 'center',
          padding: '8px',
        }}>
          — 结局 —
        </div>
      )}
    </div>
  );
}

function typeLabel(type: NodeType): string {
  const map: Record<NodeType, string> = {
    start: '· 起点 ·',
    choice: '· 抉择 ·',
    clue: '· 线索 ·',
    action: '· 行动 ·',
    monster: '· 遭遇 ·',
    ending: '· 终局 ·',
  };
  return map[type] ?? type;
}

function typeColor(type: NodeType): string {
  const map: Record<NodeType, string> = {
    start: '#e0e0e0',
    choice: '#ffeaa7',
    clue: '#74b9ff',
    action: '#55efc4',
    monster: '#ff7675',
    ending: '#b2bec3',
  };
  return map[type] ?? '#e0e0e0';
}
