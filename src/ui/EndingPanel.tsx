// ui/EndingPanel.tsx — Ending / death overlay panel.
import { useGameStore } from '../store/gameStore';
import type { EndingType } from '../engine/types';

const ICON_MAP: Record<EndingType, string> = {
  true: '🌟 真结局',
  bad: '💀 坏结局',
  death: '☠️ 死亡',
  neutral: '📖 结局',
};

const COLOR_MAP: Record<EndingType, string> = {
  true: '#ffd700',
  bad: '#cc4444',
  death: '#ff2222',
  neutral: '#8899cc',
};

export function EndingPanel() {
  const currentEnding = useGameStore(s => s.currentEnding);
  const evaluator = useGameStore(s => s.getEvaluator());
  const resetGame = useGameStore(s => s.resetGame);
  const initGame = useGameStore(s => s.initGame);
  const restoreSnapshot = useGameStore(s => s.restoreSnapshot);
  const snapshots = useGameStore(s => s.snapshots);

  if (!currentEnding) return null;

  const icon = ICON_MAP[currentEnding.type] || '📖 结局';
  const color = COLOR_MAP[currentEnding.type] || '#8899cc';

  const handleBackToBranch = () => {
    if (snapshots.length > 0) {
      const latest = snapshots[snapshots.length - 1];
      restoreSnapshot(latest.id);
    }
  };

  const handleRestart = () => {
    resetGame();
    const level = evaluator?.getLevel();
    if (level) initGame(level);
  };

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        zIndex: 49,
      }} />
      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 50,
        background: '#12121c',
        border: `2px solid ${color}`,
        borderRadius: '12px',
        padding: '28px 32px',
        minWidth: '320px',
        maxWidth: '440px',
        textAlign: 'center',
        boxShadow: `0 0 40px ${color}22, 0 8px 32px rgba(0,0,0,0.6)`,
        animation: 'node-appear 0.5s ease-out',
      }}>
        {/* Type icon */}
        <div style={{
          fontSize: '22px',
          color,
          marginBottom: '8px',
        }}>
          {icon}
        </div>

        {/* Name */}
        <h2 style={{
          color: '#e0e0e0',
          fontSize: '20px',
          margin: '0 0 16px 0',
          fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif',
        }}>
          {currentEnding.name}
        </h2>

        {/* Narrative */}
        <p style={{
          color: '#999',
          fontSize: '14px',
          lineHeight: '1.7',
          marginBottom: '24px',
          fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif',
        }}>
          {currentEnding.narrative}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          {snapshots.length > 0 && (
            <button
              onClick={handleBackToBranch}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid #444',
                borderRadius: '6px',
                color: '#aaa',
                cursor: 'pointer',
                fontSize: '13px',
                padding: '10px 20px',
                fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = '#ccc';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.color = '#aaa';
              }}
            >
              ⏪ 回到上个分支点
            </button>
          )}
          <button
            onClick={handleRestart}
            style={{
              background: 'rgba(255,80,80,0.1)',
              border: '1px solid rgba(255,80,80,0.3)',
              borderRadius: '6px',
              color: '#ff8888',
              cursor: 'pointer',
              fontSize: '13px',
              padding: '10px 20px',
              fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,80,80,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,80,80,0.1)';
            }}
          >
            🔄 重新开始
          </button>
        </div>
      </div>
    </>
  );
}
