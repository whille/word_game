// ui/GameShell.tsx — Split layout: StatusBar + ReadingPanel (top) + TreeCanvas (bottom) + Inventory.
import { useState, useEffect, useRef, useCallback } from 'react';
import { StatusBar } from './StatusBar';
import { NodeCanvas } from './NodeCanvas';
import { Inventory } from './Inventory';
import { Notebook } from './Notebook';
import { useGameStore } from '../store/gameStore';
import { SoundManager } from '../engine/SoundManager';
import { ToastContainer } from './Toast';
import { SaveManager } from './SaveManager';
import { EndingPanel } from './EndingPanel';
import { BranchMap } from './BranchMap';
import { EndingGallery } from './EndingGallery';

// Background images (generated via Minimax, Phase 3.5)
import hallwayDimImg from '../data/backgrounds/apartment_night/hallway_dim.jpg';
import redDoorImg from '../data/backgrounds/apartment_night/red_door_room.jpg';
import apt4fImg from '../data/backgrounds/apartment_night/apartment_4f.jpg';
import mirrorImg from '../data/backgrounds/apartment_night/mirror_scene.jpg';

type BgKey = 'hallway_dim' | 'red_door_room' | 'apartment_4f' | 'mirror_scene';

/** Module-level constant — values are compile-time resolved by Vite. */
const bgImages: Record<BgKey, string> = {
  hallway_dim: hallwayDimImg,
  red_door_room: redDoorImg,
  apartment_4f: apt4fImg,
  mirror_scene: mirrorImg,
};

interface GameShellProps {
  onBackToMenu?: () => void;
}

export function GameShell({ onBackToMenu }: GameShellProps) {
  // ---- UI state ----
  const [isNotebookOpen, setNotebookOpen] = useState(false);
  const [isSaveManagerOpen, setSaveManagerOpen] = useState(false);
  const [isBranchMapOpen, setBranchMapOpen] = useState(false);
  const [isGalleryOpen, setGalleryOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isMenuOpen, setMenuOpen] = useState(false);

  // ---- Sound ----
  const soundRef = useRef<SoundManager | null>(null);
  const prevNodeIdRef = useRef('');
  const prevViolationCountRef = useRef(0);
  const prevEndingCountRef = useRef(0);

  // Store subscriptions
  const currentNodeId = useGameStore(s => s.currentNodeId);
  const activeViolations = useGameStore(s => s.activeViolations);
  const discoveredEndings = useGameStore(s => s.discoveredEndings);
  const evaluator = useGameStore(s => s.getEvaluator());
  const knownRules = useGameStore(s => s.knownRules);
  const useItem = useGameStore(s => s.useItem);
  const resetGame = useGameStore(s => s.resetGame);
  const initGame = useGameStore(s => s.initGame);
  const currentBackground = useGameStore(s => s.currentBackground);

  // Compute contradictions
  const contradictionCount = (() => {
    if (!evaluator) return 0;
    return evaluator.findContradictions(useGameStore.getState()).length;
  })();

  // ---- Sound Effects ----
  useEffect(() => {
    const s = soundRef.current;
    if (!s || isMuted) return;

    if (currentNodeId && currentNodeId !== prevNodeIdRef.current) {
      s.playStinger('click');
      prevNodeIdRef.current = currentNodeId;
    }

    if (activeViolations.length > prevViolationCountRef.current) {
      s.playStinger('violation');
    }
    prevViolationCountRef.current = activeViolations.length;

    if (discoveredEndings.length > prevEndingCountRef.current) {
      const latestId = discoveredEndings[discoveredEndings.length - 1];
      const ending = evaluator?.getLevel().endings.find(e => e.id === latestId);
      if (ending?.type === 'death') {
        s.playStinger('death');
        s.stopAmbient();
      } else if (ending?.type === 'true') {
        s.playStinger('true_ending');
        s.stopAmbient();
      }
    }
    prevEndingCountRef.current = discoveredEndings.length;
  }, [currentNodeId, activeViolations.length, discoveredEndings.length, isMuted, evaluator]);

  const prevContradictionRef = useRef(0);
  useEffect(() => {
    const s = soundRef.current;
    if (!s || isMuted) return;
    if (contradictionCount > prevContradictionRef.current) {
      s.playStinger('contradiction');
    }
    prevContradictionRef.current = contradictionCount;
  }, [contradictionCount, isMuted]);

  // ---- Audio init ----
  const initAudio = useCallback(() => {
    if (!soundRef.current) {
      soundRef.current = new SoundManager();
      soundRef.current.init();
      soundRef.current.startAmbient();
    }
  }, []);

  const handleToggleMute = () => {
    initAudio();
    const s = soundRef.current;
    if (s) {
      const nowMuted = s.toggleMute();
      setIsMuted(nowMuted);
    }
  };

  const handleItemUse = useCallback((itemId: string, nodeId: string) => {
    initAudio();
    soundRef.current?.playStinger('item_use');
    useItem(itemId, nodeId);
  }, [initAudio, useItem]);

  const handleRestart = useCallback(() => {
    soundRef.current?.destroy();
    soundRef.current = null;
    resetGame();
    const level = evaluator?.getLevel();
    if (level) initGame(level);
    setMenuOpen(false);
    setIsMuted(true);
  }, [resetGame, initGame, evaluator]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#0a0a0a',
      color: '#e0e0e0',
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif',
      overflow: 'hidden',
    }}>
      {/* ======== Background Layer ======== */}
      {currentBackground && bgImages[currentBackground as BgKey] && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          backgroundImage: `url(${bgImages[currentBackground as BgKey]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.08,
          filter: 'blur(4px) grayscale(0.5)',
          transition: 'opacity 0.8s ease-in-out',
          pointerEvents: 'none',
        }} />
      )}

      {/* ======== Top Bar: Status + Controls ======== */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: '#0d0d14',
        borderBottom: '1px solid #1a1a24',
        padding: '0 8px',
        flexShrink: 0,
      }}>
        <StatusBar />

        {/* Contradiction hint */}
        {contradictionCount > 0 && (
          <button
            onClick={() => setNotebookOpen(true)}
            title="规则存在矛盾"
            style={{
              background: 'rgba(255, 80, 80, 0.12)',
              border: '1px solid rgba(255, 80, 80, 0.25)',
              borderRadius: '4px',
              color: '#ff8888',
              cursor: 'pointer',
              fontSize: '13px',
              padding: '4px 10px',
              marginLeft: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            ⚡ 矛盾
          </button>
        )}

        <div style={{ flex: 1 }} />

        {/* Menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            title="菜单"
            style={{
              background: 'none',
              border: 'none',
              color: isMenuOpen ? '#ffd700' : '#666',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '8px 10px',
            }}
          >
            ☰
          </button>
          {isMenuOpen && (
            <>
              <div
                onClick={() => setMenuOpen(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 19 }}
              />
              <div style={{
                position: 'absolute',
                top: '36px',
                right: 0,
                background: '#151520',
                border: '1px solid #2a2a35',
                borderRadius: '6px',
                zIndex: 20,
                minWidth: '140px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              }}>
                <button
                  onClick={() => { setSaveManagerOpen(true); setMenuOpen(false); }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 16px',
                    background: 'none',
                    border: 'none',
                    color: '#c4a56a',
                    cursor: 'pointer',
                    fontSize: '13px',
                    textAlign: 'left',
                    borderBottom: '1px solid #1a1a28',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#1a1a2e'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                >
                  💾 存档管理
                </button>
                <button
                  onClick={() => { setGalleryOpen(true); setMenuOpen(false); }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 16px',
                    background: 'none',
                    border: 'none',
                    color: '#8899cc',
                    cursor: 'pointer',
                    fontSize: '13px',
                    textAlign: 'left',
                    borderBottom: '1px solid #1a1a28',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#1a1a2e'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                >
                  🏆 结局收藏
                </button>
                {onBackToMenu && (
                  <button
                    onClick={() => { onBackToMenu(); setMenuOpen(false); }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '10px 16px',
                      background: 'none',
                      border: 'none',
                      color: '#aaa',
                      cursor: 'pointer',
                      fontSize: '13px',
                      textAlign: 'left',
                      borderBottom: '1px solid #1a1a28',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#1a1a2e'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                  >
                    ↩ 返回菜单
                  </button>
                )}
                <button
                  onClick={handleRestart}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 16px',
                    background: 'none',
                    border: 'none',
                    color: '#ff8888',
                    cursor: 'pointer',
                    fontSize: '13px',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#1a1a2e'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                >
                  🔄 重新开始
                </button>
              </div>
            </>
          )}
        </div>

        {/* BranchMap toggle */}
        <button
          onClick={() => setBranchMapOpen(o => !o)}
          title="分支地图"
          style={{
            background: 'none',
            border: 'none',
            color: isBranchMapOpen ? '#c4a56a' : '#666',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '8px 10px',
          }}
        >
          🗺️
        </button>

        {/* Notebook toggle */}
        <button
          onClick={() => setNotebookOpen(o => !o)}
          title="笔记"
          style={{
            background: 'none',
            border: 'none',
            color: isNotebookOpen ? '#c4a56a' : '#666',
            cursor: 'pointer',
            fontSize: '11px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          📓 笔记
          {knownRules.size > 0 && (
            <span style={{
              background: '#333',
              color: '#aaa',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
            }}>
              {knownRules.size}
            </span>
          )}
        </button>

        {/* Sound toggle */}
        <button
          onClick={handleToggleMute}
          title={isMuted ? '开启音效' : '关闭音效'}
          style={{
            background: 'none',
            border: 'none',
            color: isMuted ? '#666' : '#7ec8e3',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '8px 12px',
          }}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* ======== Tree Canvas ======== */}
      <NodeCanvas
        selectedItemId={selectedItemId}
        onItemUse={handleItemUse}
        onItemDeselect={() => setSelectedItemId(null)}
      />

      {/* ======== Inventory Bar ======== */}
      <Inventory
        selectedItemId={selectedItemId}
        onSelectItem={setSelectedItemId}
      />

      {/* ======== Notebook Slide-out ======== */}
      <Notebook
        isOpen={isNotebookOpen}
        onClose={() => setNotebookOpen(false)}
      />

      {/* ======== Save Manager ======== */}
      <SaveManager
        isOpen={isSaveManagerOpen}
        onClose={() => setSaveManagerOpen(false)}
      />

      {/* ======== Ending Panel ======== */}
      <EndingPanel />

      {/* ======== Branch Map (minimap) ======== */}
      <BranchMap
        isOpen={isBranchMapOpen}
        onClose={() => setBranchMapOpen(false)}
      />

      {/* ======== Ending Gallery ======== */}
      <EndingGallery
        isOpen={isGalleryOpen}
        onClose={() => setGalleryOpen(false)}
      />

      {/* ======== Toast Notifications ======== */}
      <ToastContainer />
    </div>
  );
}
