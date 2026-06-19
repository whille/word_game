// App.tsx — Root component. Level selection → load → init → GameShell or EditorShell.
import { useState, useCallback } from 'react';
import { GameShell } from './ui/GameShell';
import { EditorShell } from './editor/EditorShell';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { LevelLoadError } from './ui/LevelLoadError';
import { useGameStore } from './store/gameStore';
import { useEditorStore } from './editor/EditorStore';
import { loadLevel } from './data/schema';
import type { Level } from './engine/types';

// Available levels
import apartmentNight from './data/levels/apartment_night.json';
import midnightHospital from './data/levels/midnight_hospital.json';
import midnightLibrary from './data/levels/midnight_library.json';

const LEVELS = [
  { key: 'apartment_night', label: '🏢 公寓深夜', data: apartmentNight, desc: '老公寓的住户守则互相矛盾。楼道里传来奇怪的声响。' },
  { key: 'midnight_hospital', label: '🏥 午夜医院', data: midnightHospital, desc: '废弃医院里醒来的病人。护士站有东西在等你。' },
  { key: 'midnight_library', label: '📚 深夜图书馆', data: midnightLibrary, desc: '闭馆后独自醒来。禁书在架子上轻轻呼吸。守则在改写自己。' },
] as const;

type LevelKey = (typeof LEVELS)[number]['key'];
type View = 'menu' | 'game' | 'editor';

export default function App() {
  const [view, setView] = useState<View>('menu');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<LevelKey | null>(null);
  const initGame = useGameStore(s => s.initGame);
  const resetGame = useGameStore(s => s.resetGame);
  const currentNodeId = useGameStore(s => s.currentNodeId);

  const startLevel = useCallback((key: LevelKey) => {
    const entry = LEVELS.find(l => l.key === key);
    if (!entry) return;
    const result = loadLevel(entry.data);
    if (!result.ok) {
      setLoadError(result.error);
      return;
    }
    resetGame();
    initGame(result.level as Level);
    setActiveKey(key);
    setLoadError(null);
    setView('game');
  }, [initGame, resetGame]);

  const startEditor = useCallback(() => {
    useEditorStore.getState().initBlank('新关卡');
    setView('editor');
  }, []);

  const playFromEditor = useCallback((json: string) => {
    const data = JSON.parse(json);
    const result = loadLevel(data);
    if (!result.ok) {
      alert('关卡数据错误: ' + result.error);
      return;
    }
    resetGame();
    initGame(result.level as Level);
    setView('game');
  }, [initGame, resetGame]);

  // Error state
  if (loadError) {
    return (
      <LevelLoadError
        error={loadError}
        onRetry={() => { setLoadError(null); setView('menu'); }}
      />
    );
  }

  // Editor
  if (view === 'editor') {
    return (
      <ErrorBoundary>
        <EditorShell
          onBack={() => setView('menu')}
          onPlay={playFromEditor}
        />
      </ErrorBoundary>
    );
  }

  // Game
  if (view === 'game' && currentNodeId) {
    return (
      <ErrorBoundary>
        <GameShell onBackToMenu={() => setView('menu')} />
      </ErrorBoundary>
    );
  }

  // Menu
  return (
    <ErrorBoundary>
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#e0e0e0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif',
        gap: '2rem',
        padding: '2rem',
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: '#ffd700',
          textShadow: '0 0 20px rgba(255, 215, 0, 0.3)',
          margin: 0,
          textAlign: 'center',
        }}>
          文字规则怪谈
        </h1>
        <p style={{ color: '#666', fontSize: '1rem', maxWidth: '400px', textAlign: 'center', lineHeight: 1.8 }}>
          规则互相矛盾。选择决定命运。<br />每一次点击都在走向不同的结局。
        </p>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          width: '100%',
          maxWidth: '420px',
        }}>
          {LEVELS.map(l => (
            <button key={l.key} onClick={() => startLevel(l.key)}
              style={menuCard}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.3rem' }}>{l.label}</div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>{l.desc}</div>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <button onClick={startEditor}
            style={{ ...menuCard, background: '#0d1a0d', borderColor: '#1a2a1a', textAlign: 'center', padding: '0.8rem 1.5rem' }}>
            🎨 关卡编辑器
          </button>
          {activeKey && (
            <button onClick={() => startLevel(activeKey)}
              style={{ ...menuCard, textAlign: 'center', padding: '0.8rem 1.5rem' }}>
              继续当前关卡
            </button>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

const menuCard: React.CSSProperties = {
  padding: '1.2rem 1.5rem',
  background: '#1a1a28',
  border: '1px solid #333',
  borderRadius: '8px',
  color: '#ccc',
  fontSize: '1.1rem',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'border-color 0.2s, background 0.2s',
};
