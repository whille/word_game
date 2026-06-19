// ui/Notebook.tsx — Slide-out panel showing discovered rules and contradictions.
import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';

interface NotebookProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Notebook({ isOpen, onClose }: NotebookProps) {
  const knownRules = useGameStore(s => s.knownRules);
  const evaluator = useGameStore(s => s.getEvaluator());

  // Compute contradictions from the engine
  const contradictions = useMemo(() => {
    if (!evaluator) return [];
    return evaluator.findContradictions(useGameStore.getState());
  }, [evaluator, knownRules]);

  // Build sorted rule list
  const rules = useMemo(() => {
    if (!evaluator) return [];
    const level = evaluator.getLevel();
    const result: { id: string; order: number; text: string; annotation?: string; isContradicted: boolean }[] = [];
    for (const [ruleId, ruleText] of knownRules) {
      const def = level.rules.find(r => r.id === ruleId);
      const isContradicted = contradictions.some(c => c.ruleA === ruleId || c.ruleB === ruleId);
      result.push({
        id: ruleId,
        order: def?.order ?? 999,
        text: ruleText,
        annotation: def?.annotation,
        isContradicted,
      });
    }
    result.sort((a, b) => a.order - b.order);
    return result;
  }, [knownRules, evaluator, contradictions]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 10,
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '320px',
        maxWidth: '90vw',
        background: '#111118',
        borderLeft: '1px solid #333',
        zIndex: 11,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
        animation: 'slideInRight 0.25s ease-out',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid #222',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '16px',
            color: '#c4a56a',
            fontFamily: '"PingFang SC", serif',
            letterSpacing: '1px',
          }}>
            📓 笔记
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Contradiction alert */}
        {contradictions.length > 0 && (
          <div style={{
            margin: '12px 16px',
            padding: '10px 14px',
            background: 'rgba(255, 80, 80, 0.08)',
            border: '1px solid rgba(255, 80, 80, 0.2)',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#ff8888',
          }}>
            <span style={{ fontSize: '14px', marginRight: '6px' }}>⚡</span>
            这些规则之间似乎存在矛盾
          </div>
        )}

        {/* Rules list */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '8px 16px 24px',
        }}>
          {rules.length === 0 ? (
            <p style={{ color: '#666', fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>
              尚未发现任何规则...
            </p>
          ) : (
            rules.map(rule => (
              <div
                key={rule.id}
                style={{
                  padding: '12px 0',
                  borderBottom: '1px solid #1a1a24',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}>
                  <span style={{
                    flexShrink: 0,
                    width: '22px',
                    height: '22px',
                    background: '#1a1a2e',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    color: '#888',
                  }}>
                    {rule.order}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      margin: 0,
                      fontSize: '13px',
                      color: rule.isContradicted ? '#ffaa88' : '#ccc',
                      lineHeight: '1.6',
                    }}>
                      {rule.text}
                      {rule.isContradicted && (
                        <span style={{ marginLeft: '6px', fontSize: '12px' }}>⚡</span>
                      )}
                    </p>
                    {rule.annotation && (
                      <p style={{
                        margin: '4px 0 0',
                        fontSize: '11px',
                        color: '#666',
                        textDecoration: 'line-through',
                        fontStyle: 'italic',
                      }}>
                        {rule.annotation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Slide-in keyframe */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
