// ui/StatusBar.tsx — Animated HP and Sanity bars.
import { useGameStore } from '../store/gameStore';

export function StatusBar() {
  const hp = useGameStore(s => s.hp);
  const sanity = useGameStore(s => s.sanity);

  return (
    <div style={{
      display: 'flex',
      gap: '1rem',
      padding: '0.75rem 1rem',
      background: '#0d0d0d',
      borderBottom: '1px solid #222',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <Bar label="生命" value={hp} color="#ff4444" />
      <Bar label="理智" value={sanity} color="#4488ff" />
    </div>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div style={{ flex: 1 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '4px',
        fontSize: '12px',
        color: '#aaa',
      }}>
        <span>{label}</span>
        <span style={{ color: clamped <= 20 ? '#ff4444' : '#ccc' }}>{clamped}</span>
      </div>
      <div style={{
        width: '100%',
        height: '8px',
        background: '#1a1a1a',
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${clamped}%`,
          height: '100%',
          background: color,
          borderRadius: '4px',
          transition: 'width 0.5s ease, background 0.3s ease',
          boxShadow: clamped <= 20 ? `0 0 8px ${color}` : 'none',
        }} />
      </div>
    </div>
  );
}
