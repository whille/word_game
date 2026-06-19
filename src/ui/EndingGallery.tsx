// ui/EndingGallery.tsx — Grid of all game endings.
// Unlocked: show name + narrative + type icon. Locked: ??? placeholder.
import { useGameStore } from '../store/gameStore';
import type { EndingType } from '../engine/types';

const ICON_MAP: Record<EndingType, string> = {
  true: '🌟',
  bad: '💀',
  death: '☠️',
  neutral: '📖',
};

const LABEL_MAP: Record<EndingType, string> = {
  true: '真结局',
  bad: '坏结局',
  death: '死亡',
  neutral: '普通结局',
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function EndingGallery({ isOpen, onClose }: Props) {
  const evaluator = useGameStore(s => s.getEvaluator());
  const discoveredEndings = useGameStore(s => s.discoveredEndings);

  if (!isOpen) return null;

  const allEndings = evaluator?.getLevel().endings ?? [];
  const unlockedCount = discoveredEndings.length;
  const totalCount = allEndings.length;
  const pct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 29,
        }}
      />
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 30,
        background: '#12121c',
        border: '1px solid #2a2a35',
        borderRadius: '10px',
        padding: '24px',
        minWidth: '340px',
        maxWidth: '460px',
        maxHeight: '75vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}>
          <h3 style={{ color: '#c4a56a', fontSize: '16px', margin: 0 }}>🏆 结局收藏</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Progress bar */}
        <div style={{
          background: '#1a1a28',
          borderRadius: '6px',
          height: '6px',
          marginBottom: '16px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${pct}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #c4a56a, #ffd700)',
            borderRadius: '6px',
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{
          color: '#666',
          fontSize: '11px',
          textAlign: 'center',
          marginBottom: '16px',
        }}>
          {unlockedCount} / {totalCount} 已解锁
        </div>

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          overflowY: 'auto',
          flex: 1,
        }}>
          {allEndings.map(ending => {
            const unlocked = discoveredEndings.includes(ending.id);
            return (
              <div
                key={ending.id}
                style={{
                  background: unlocked ? '#1a1a28' : '#111119',
                  border: unlocked
                    ? `1px solid ${ending.type === 'true' ? '#4a3a1a' : '#2a1a1a'}`
                    : '1px solid #1a1a24',
                  borderRadius: '8px',
                  padding: '12px',
                  opacity: unlocked ? 1 : 0.5,
                }}
              >
                {unlocked ? (
                  <>
                    <div style={{
                      fontSize: '18px',
                      marginBottom: '4px',
                    }}>
                      {ICON_MAP[ending.type]}
                    </div>
                    <div style={{
                      color: '#ccc',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      marginBottom: '4px',
                    }}>
                      {ending.name}
                    </div>
                    <div style={{
                      color: '#777',
                      fontSize: '11px',
                      lineHeight: '1.4',
                    }}>
                      {ending.narrative.slice(0, 40)}...
                    </div>
                    <div style={{
                      color: '#555',
                      fontSize: '10px',
                      marginTop: '6px',
                    }}>
                      {LABEL_MAP[ending.type]}
                    </div>
                  </>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '80px',
                  }}>
                    <div style={{ color: '#444', fontSize: '24px' }}>???</div>
                    <div style={{ color: '#333', fontSize: '10px', marginTop: '6px' }}>
                      未解锁
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
