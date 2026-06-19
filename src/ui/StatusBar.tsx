// ui/StatusBar.tsx — Animated HP and Sanity bars with change-flash effect.
import { useRef, useEffect, useState } from 'react';
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
      <AnimatedBar label="生命" value={hp} color="#ff4444" />
      <AnimatedBar label="理智" value={sanity} color="#4488ff" />
    </div>
  );
}

function AnimatedBar({ label, value, color }: { label: string; value: number; color: string }) {
  const prevRef = useRef(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (value === prevRef.current) return;
    const dir = value > prevRef.current ? 'up' : 'down';
    prevRef.current = value;
    setFlash(dir);
    const t = setTimeout(() => setFlash(null), 400);
    return () => clearTimeout(t);
  }, [value]);

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
        <span style={{
          color: clamped <= 20 ? '#ff4444' : '#ccc',
          fontWeight: flash ? 'bold' : 'normal',
          transform: flash ? 'scale(1.15)' : 'scale(1)',
          transition: 'transform 0.15s ease, color 0.3s ease',
          display: 'inline-block',
        }}>
          {clamped}
        </span>
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
          background: flash === 'down'
            ? `linear-gradient(90deg, ${color}, #fff, ${color})`
            : color,
          backgroundSize: flash === 'down' ? '200% 100%' : '100% 100%',
          borderRadius: '4px',
          transition: 'width 0.5s ease, background 0.15s ease',
          boxShadow: clamped <= 20 ? `0 0 8px ${color}` : 'none',
          animation: flash === 'down'
            ? 'bar-flash-down 0.35s ease-out'
            : flash === 'up'
              ? 'bar-flash-up 0.35s ease-out'
              : 'none',
        }} />
      </div>
    </div>
  );
}
