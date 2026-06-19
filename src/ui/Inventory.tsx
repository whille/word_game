// ui/Inventory.tsx — Horizontal item bar. Click to select, click node to use.
import { useGameStore } from '../store/gameStore';

interface InventoryProps {
  selectedItemId: string | null;
  onSelectItem: (itemId: string | null) => void;
}

export function Inventory({ selectedItemId, onSelectItem }: InventoryProps) {
  const items = useGameStore(s => s.items);
  const evaluator = useGameStore(s => s.getEvaluator());

  if (items.length === 0) return null;

  // Resolve item IDs to names from level data
  const itemDefs = evaluator?.getLevel().items ?? [];

  return (
    <div style={{
      padding: '8px 16px',
      borderTop: '1px solid #1a1a24',
      background: '#0d0d14',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      overflowX: 'auto',
      flexShrink: 0,
      minHeight: '56px',
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
        return (
          <button
            key={itemId}
            onClick={() => onSelectItem(isSelected ? null : itemId)}
            title={def?.usableOn?.length ? `可用在: ${def.usableOn.join(', ')}` : '点击选中后使用'}
            style={{
              padding: '6px 14px',
              background: isSelected ? '#2a2a3e' : '#1a1a28',
              color: isSelected ? '#ffd700' : '#aaa',
              border: isSelected ? '1px solid #ffd700' : '1px solid #2a2a30',
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
            {isSelected && (
              <span style={{
                fontSize: '10px',
                color: '#ffd700',
                animation: 'text-glow-pulse 2s infinite',
              }}>
                ✓ 已选中
              </span>
            )}
          </button>
        );
      })}
      {selectedItemId && (
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
  };
  const lower = itemId.toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (lower.includes(k)) return v;
  }
  return '📦';
}
