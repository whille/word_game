// editor/RulePanel.tsx — Property editor for a rule.
import { useEditorStore } from './EditorStore';
import type { RuleDef } from '../engine/types';

interface Props {
  rule: RuleDef;
  allRuleIds: string[];
}

export function RulePanel({ rule }: Props) {
  const updateRule = useEditorStore(s => s.updateRule);
  const removeRule = useEditorStore(s => s.removeRule);
  const clearSelection = useEditorStore(s => s.clearSelection);

  return (
    <div style={{ fontSize: '13px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontWeight: 'bold', color: '#aaa' }}>规则: {rule.id}</span>
        <button onClick={() => { removeRule(rule.id); clearSelection(); }}
          style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '16px' }}>🗑️</button>
      </div>

      <Label>排序</Label>
      <Input type="number" value={String(rule.order)}
        onChange={e => updateRule(rule.id, { order: Number(e.target.value) })} />

      <Label>规则文本</Label>
      <TextArea value={rule.text} onChange={e => updateRule(rule.id, { text: e.target.value })}
        rows={2} placeholder="规则内容..." />

      <Label>注解 (optional)</Label>
      <Input value={rule.annotation ?? ''} placeholder="规则旁的注释"
        onChange={e => updateRule(rule.id, { annotation: e.target.value || undefined })} />

      <Label>违反条件表达式</Label>
      <Input value={rule.violation.condition} placeholder="has_flag('saw_monster')"
        onChange={e => updateRule(rule.id, {
          violation: { ...rule.violation, condition: e.target.value }
        })} />

      <Label>违反立即效果 — HP delta</Label>
      <Input type="number" value={String(rule.violation.immediate.hp ?? '')} placeholder="0"
        onChange={e => updateRule(rule.id, {
          violation: {
            ...rule.violation,
            immediate: { ...rule.violation.immediate, hp: e.target.value ? Number(e.target.value) : undefined },
          }
        })} />

      <Label>违反立即效果 — Sanity delta</Label>
      <Input type="number" value={String(rule.violation.immediate.sanity ?? '')} placeholder="0"
        onChange={e => updateRule(rule.id, {
          violation: {
            ...rule.violation,
            immediate: { ...rule.violation.immediate, sanity: e.target.value ? Number(e.target.value) : undefined },
          }
        })} />

      <Label>违反旁白</Label>
      <Input value={rule.violation.immediate.narrative ?? ''} placeholder="违反规则时的提示"
        onChange={e => updateRule(rule.id, {
          violation: {
            ...rule.violation,
            immediate: { ...rule.violation.immediate, narrative: e.target.value || undefined },
          }
        })} />

      <Label>违反叙事 (持续显示)</Label>
      <Input value={rule.violation.narrative} placeholder="持续显示的文字"
        onChange={e => updateRule(rule.id, {
          violation: { ...rule.violation, narrative: e.target.value }
        })} />

      <Label>矛盾规则 ID (逗号分隔)</Label>
      <Input value={rule.contradicts?.join(', ') ?? ''} placeholder="rule_2, rule_5"
        onChange={e => updateRule(rule.id, {
          contradicts: e.target.value ? e.target.value.split(',').map(s => s.trim()) : undefined,
        })} />

      {/* Persistent violation */}
      <div style={{ marginTop: '12px', borderTop: '1px solid #1a1a24', paddingTop: '8px' }}>
        <Label style={{ color: '#888' }}>持续违反效果 (optional)</Label>
        <Label>触发事件</Label>
        <Input value={rule.violation.persistent?.tick ?? ''} placeholder="node_enter"
          onChange={e => updateRule(rule.id, {
            violation: {
              ...rule.violation,
              persistent: e.target.value ? {
                tick: e.target.value,
                effect: rule.violation.persistent?.effect ?? {},
                until: rule.violation.persistent?.until ?? '',
              } : undefined,
            }
          })} />
        <Label>每 tick — HP</Label>
        <Input type="number" value={String(rule.violation.persistent?.effect?.hp ?? '')}
          onChange={e => updateRule(rule.id, {
            violation: {
              ...rule.violation,
              persistent: rule.violation.persistent ? {
                ...rule.violation.persistent,
                effect: { ...rule.violation.persistent.effect, hp: e.target.value ? Number(e.target.value) : undefined },
              } : undefined,
            }
          })} />
        <Label>每 tick — Sanity</Label>
        <Input type="number" value={String(rule.violation.persistent?.effect?.sanity ?? '')}
          onChange={e => updateRule(rule.id, {
            violation: {
              ...rule.violation,
              persistent: rule.violation.persistent ? {
                ...rule.violation.persistent,
                effect: { ...rule.violation.persistent.effect, sanity: e.target.value ? Number(e.target.value) : undefined },
              } : undefined,
            }
          })} />
        <Label>停止条件</Label>
        <Input value={rule.violation.persistent?.until ?? ''} placeholder="visited('safe_room')"
          onChange={e => updateRule(rule.id, {
            violation: {
              ...rule.violation,
              persistent: rule.violation.persistent ? {
                ...rule.violation.persistent,
                until: e.target.value,
              } : undefined,
            }
          })} />
      </div>
    </div>
  );
}

// ---- Shared helper components (reuse from NodePanel pattern) ----
function Label({ children, style }: { children: string; style?: React.CSSProperties }) {
  return <div style={{ fontSize: '11px', color: '#666', marginTop: '8px', marginBottom: '3px', ...style }}>{children}</div>;
}

function Input({ value, onChange, placeholder, type }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; type?: string;
}) {
  return <input value={value} onChange={onChange} placeholder={placeholder} type={type ?? 'text'}
    style={{
      width: '100%', padding: '4px 6px', background: '#111', border: '1px solid #222',
      borderRadius: '3px', color: '#ccc', fontSize: '12px', boxSizing: 'border-box',
    }} />;
}

function TextArea({ value, onChange, rows, placeholder }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; rows: number; placeholder?: string;
}) {
  return <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
    style={{
      width: '100%', padding: '4px 6px', background: '#111', border: '1px solid #222',
      borderRadius: '3px', color: '#ccc', fontSize: '12px', boxSizing: 'border-box', resize: 'vertical',
    }} />;
}
