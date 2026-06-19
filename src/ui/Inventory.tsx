// ui/Inventory.tsx — Horizontal item bar. Click to select, click node to use.
// Also supports item combination: toggle combine mode → select two items → combine.
import { useState } from 'react';
import { useGameStore } from '../store/gameStore';

interface InventoryProps {
  selectedItemId: string | null;
  onSelectItem: (itemId: string | null) => void;
}

export function Inventory({ selectedItemId, onSelectItem }: InventoryProps) {
  const items = useGameStore(s => s.items);
  const evaluator = useGameStore(s => s.getEvaluator());
  const combineItems = useGameStore(s => s.combineItems);

  const [combineMode, setCombineMode] = useState(false);
  const [combineA, setCombineA] = useState<string | null>(null);
  const [combineB, setCombineB] = useState<string | null>(null);

  if (items.length === 0) return null;

  const itemDefs = evaluator?.getLevel().items ?? [];

  // Find combinable pairs among current items
  const combinablePairs: [string, string, string][] = [];
  for (let i = 0; i < items.length; i++) {
    const defA = itemDefs.find(d => d.id === items[i]);
    for (let j = i + 1; j < items.length; j++) {
      const defB = itemDefs.find(d => d.id === items[j]);
      if (defA?.combine?.with === items[j]) {
        const result = itemDefs.find(d => d.id === defA.combine!.becomes);
        combinablePairs.push([items[i], items[j], result?.name ?? defA.combine.becomes]);
      }
      if (defB?.combine?.with === items[i]) {
        const result = itemDefs.find(d => d.id === defB.combine!.becomes);
        combinablePairs.push([items[i], items[j], result?.name ?? defB.combine.becomes]);
      }
    }
  }
  const hasCombinable = combinablePairs.length > 0;

  const handleItemClick = (itemId: string) => {
    if (combineMode) {
      if (!combineA) {
        setCombineA(itemId);
      } else if (!combineB && itemId !== combineA) {
        // Attempt combine
        combineItems(combineA, itemId);
        setCombineA(null);
        setCombineB(null);
        setCombineMode(false);
      }
      return;
    }
    onSelectItem(selectedItemId === itemId ? null : itemId);
  };

  const selectedForCombine = (itemId: string) => itemId === combineA || itemId === combineB;

  return (
    <div style={{
      padding: '8px 16px',
      borderTop: '1px solid #1a1a24',
      background: combineMode ? '#0d0a10' : '#0d0d14',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      overflowX: 'auto',
      flexShrink: 0,
      minHeight: '56px',
      transition: 'background 0.2s',
    }}>
      <span style={{
        fontSize: '11px',
        color: '#555',
        textTransform: 'uppercase',
        letterSpacing: '2px',
        flexShrink: 0,
      }}>
        道具
      </span>
      {items.map(itemId => {
        const def = itemDefs.find(d => d.id === itemId);
        const isSelected = itemId === selectedItemId;
        const isCombineSelected = selectedForCombine(itemId);
        return (
          <button
            key={itemId}
            onClick={() => handleItemClick(itemId)}
            title={def?.usableOn?.length ? `可用在: ${def.usableOn.join(', ')}` : '点击选中后使用'}
            style={{
              padding: '6px 14px',
              background: isCombineSelected
                ? '#2a1a3e'
                : isSelected ? '#2a2a3e' : '#1a1a28',
              color: isCombineSelected
                ? '#c4a5e8'
                : isSelected ? '#ffd700' : '#aaa',
              border: isCombineSelected
                ? '1px solid #8060b0'
                : isSelected ? '1px solid #ffd700' : '1px solid #2a2a30',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '16px' }}>
              {itemIcon(def?.id ?? itemId)}
            </span>
            {def?.name ?? itemId}
            {isSelected && !combineMode && (
              <span style={{
                fontSize: '10px',
                color: '#ffd700',
                animation: 'text-glow-pulse 2s infinite',
              }}>
                ✓ 已选中
              </span>
            )}
            {isCombineSelected && (
              <span style={{ fontSize: '10px', color: '#c4a5e8' }}>
                {itemId === combineA ? '①' : '②'}
              </span>
            )}
          </button>
        );
      })}

      {/* Combine mode toggle */}
      {hasCombinable && (
        <button
          onClick={() => {
            if (combineMode) {
              setCombineMode(false);
              setCombineA(null);
              setCombineB(null);
            } else {
              setCombineMode(true);
              onSelectItem(null); // exit use mode
            }
          }}
          style={{
            padding: '6px 12px',
            background: combineMode ? '#2a1a2e' : 'none',
            border: combineMode ? '1px solid #6040a0' : '1px solid #2a2a30',
            borderRadius: '6px',
            color: combineMode ? '#c4a5e8' : '#666',
            cursor: 'pointer',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {combineMode ? '✕ 取消合成' : '⚗️ 合成'}
        </button>
      )}

      {combineMode && (
        <span style={{ fontSize: '11px', color: '#6040a0', flexShrink: 0 }}>
          {!combineA ? '选择第一个道具' : '选择第二个道具'}
        </span>
      )}

      {/* Cancel selection */}
      {selectedItemId && !combineMode && (
        <button
          onClick={() => onSelectItem(null)}
          style={{
            padding: '4px 8px',
            background: 'none',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          取消
        </button>
      )}
    </div>
  );
}

/** Simple emoji icons for common item types. */
function itemIcon(itemId: string): string {
  const map: Record<string, string> = {
    key: '🔑',
    flashlight: '🔦',
    knife: '🔪',
    bandage: '🩹',
    note: '📄',
    photo: '📷',
    ring: '💍',
    candle: '🕯️',
    mirror: '🪞',
    bell: '🔔',
    doll: '🪆',
    medicine: '💊',
    cross: '✝️',
    record: '📋',
    keycard: '💳',
  };
  const lower = itemId.toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (lower.includes(k)) return v;
  }
  return '📦';
}
