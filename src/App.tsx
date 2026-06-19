// App.tsx — Root component. Level selection → load → init → GameShell or EditorShell.
import { useState, useCallback, useEffect, useRef } from 'react';
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

/** Decode a shared level from URL param */
function loadFromURL(): { level: Level } | null {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('level') || params.get('l');
  if (!encoded) return null;
  try {
    const json = JSON.parse(atob(decodeURIComponent(encoded)));
    const result = loadLevel(json);
    if (result.ok) return { level: result.level };
  } catch { /* invalid URL param — ignore */ }
  return null;
}

export default function App() {
  const [view, setView] = useState<View>('menu');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<LevelKey | null>(null);
  const [shareTitle, setShareTitle] = useState<string | null>(null);
  const initGame = useGameStore(s => s.initGame);
  const resetGame = useGameStore(s => s.resetGame);
  const currentNodeId = useGameStore(s => s.currentNodeId);
  const urlCheckedRef = useRef(false);

  // Check URL for shared level on first mount
  useEffect(() => {
    if (urlCheckedRef.current) return;
    urlCheckedRef.current = true;
    const shared = loadFromURL();
    if (shared) {
      resetGame();
      initGame(shared.level);
      setShareTitle(shared.level.meta.title);
      setView('game');
      // Clean URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete('level');
      url.searchParams.delete('l');
      window.history.replaceState({}, '', url.toString());
    }
  }, [initGame, resetGame]);

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
    setShareTitle(null);
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
        {shareTitle && (
          <div style={{
            padding: '6px 16px', background: '#1a1a2e', borderBottom: '1px solid #2a2a4a',
            color: '#8899cc', fontSize: '12px', textAlign: 'center',
          }}>
            📤 正在游玩分享关卡：「{shareTitle}」
          </div>
        )}
        <GameShell onBackToMenu={() => { setView('menu'); setShareTitle(null); }} />
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
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
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
          <button onClick={async () => {
            try {
              const text = await navigator.clipboard.readText();
              const json = JSON.parse(text);
              const result = loadLevel(json);
              if (!result.ok) { alert('关卡数据无效: ' + result.error); return; }
              resetGame();
              initGame(result.level as Level);
              setShareTitle(result.level.meta.title);
              setView('game');
            } catch { alert('剪贴板中没有有效的关卡 JSON。请复制包含关卡数据的文本。'); }
          }}
            style={{ ...menuCard, background: '#1a1a2e', borderColor: '#2a2a4a', textAlign: 'center', padding: '0.8rem 1.5rem' }}>
            📋 粘贴分享关卡
          </button>
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
