// ui/GameShell.tsx — Layout container. Wires all Phase 2 modules:
// StatusBar + NodeCanvas + Inventory + Notebook + SoundManager + Contradiction hints.
import { useState, useEffect, useRef, useCallback } from 'react';
import { StatusBar } from './StatusBar';
import { NodeCanvas } from './NodeCanvas';
import { Inventory } from './Inventory';
import { Notebook } from './Notebook';
import { useGameStore } from '../store/gameStore';
import { SoundManager } from '../engine/SoundManager';

export function GameShell() {
  // ---- UI state ----
  const [isNotebookOpen, setNotebookOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  // ---- Sound ----
  const soundRef = useRef<SoundManager | null>(null);
  const prevNodeIdRef = useRef<string>('');
  const prevViolationCountRef = useRef<number>(0);
  const prevEndingCountRef = useRef<number>(0);

  // Store subscriptions
  const currentNodeId = useGameStore(s => s.currentNodeId);
  const activeViolations = useGameStore(s => s.activeViolations);
  const discoveredEndings = useGameStore(s => s.discoveredEndings);
  const evaluator = useGameStore(s => s.getEvaluator());
  const knownRules = useGameStore(s => s.knownRules);
  const useItem = useGameStore(s => s.useItem);

  // Compute contradictions for hint display
  const contradictionCount = (() => {
    if (!evaluator) return 0;
    return evaluator.findContradictions(useGameStore.getState()).length;
  })();

  // ---- Sound Effects via state watching ----
  useEffect(() => {
    const s = soundRef.current;
    if (!s || isMuted) return;

    // Node changed → click sound
    if (currentNodeId && currentNodeId !== prevNodeIdRef.current) {
      s.playStinger('click');
      prevNodeIdRef.current = currentNodeId;
    }

    // New violation → violation sound
    if (activeViolations.length > prevViolationCountRef.current) {
      s.playStinger('violation');
    }
    prevViolationCountRef.current = activeViolations.length;

    // New ending discovered → death or true ending sound
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

  // Contradiction sound
  const prevContradictionRef = useRef(0);
  useEffect(() => {
    const s = soundRef.current;
    if (!s || isMuted) return;
    if (contradictionCount > prevContradictionRef.current) {
      s.playStinger('contradiction');
    }
    prevContradictionRef.current = contradictionCount;
  }, [contradictionCount, isMuted]);

  // ---- Audio init on first interaction ----
  const initAudio = useCallback(() => {
    if (!soundRef.current) {
      soundRef.current = new SoundManager();
      soundRef.current.init();
      soundRef.current.startAmbient();
    }
  }, []);

  // ---- Handlers ----
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

  const handleNodeClick = () => {
    initAudio();
  };

  return (
    <div
      onClick={handleNodeClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#0a0a0a',
        color: '#e0e0e0',
        fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Top bar: StatusBar + Controls */}
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
            title="规则存在矛盾 — 点击查看笔记"
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

        {/* Notebook toggle */}
        <button
          onClick={() => setNotebookOpen(o => !o)}
          title="笔记 — 已发现规则"
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

      {/* Main canvas */}
      <NodeCanvas
        selectedItemId={selectedItemId}
        onItemUse={handleItemUse}
        onItemDeselect={() => setSelectedItemId(null)}
      />

      {/* Inventory bar */}
      <Inventory
        selectedItemId={selectedItemId}
        onSelectItem={setSelectedItemId}
      />

      {/* Notebook slide-out */}
      <Notebook
        isOpen={isNotebookOpen}
        onClose={() => setNotebookOpen(false)}
      />
    </div>
  );
}
