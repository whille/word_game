// editor/EndingPanel.tsx — Property editor for an ending definition.
import { useEditorStore } from './EditorStore';
import type { EndingDef, EndingType } from '../engine/types';

interface Props {
  ending: EndingDef;
}

const ENDING_TYPES: { value: EndingType; label: string }[] = [
  { value: 'true', label: '✅ 真结局' },
  { value: 'bad', label: '❌ 坏结局' },
  { value: 'neutral', label: '⚪ 中性结局' },
  { value: 'death', label: '💀 死亡结局' },
];

export function EndingPanel({ ending }: Props) {
  const updateEnding = useEditorStore(s => s.updateEnding);
  const removeEnding = useEditorStore(s => s.removeEnding);
  const clearSelection = useEditorStore(s => s.clearSelection);

  return (
    <div style={{ fontSize: '13px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontWeight: 'bold', color: '#aaa' }}>结局: {ending.id}</span>
        <button onClick={() => { removeEnding(ending.id); clearSelection(); }}
          style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '16px' }}>🗑️</button>
      </div>

      <Label>名称</Label>
      <Input value={ending.name} placeholder="结局名称"
        onChange={e => updateEnding(ending.id, { name: e.target.value })} />

      <Label>类型</Label>
      <Select value={ending.type}
        onChange={e => updateEnding(ending.id, { type: e.target.value as EndingType })}>
        {ENDING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </Select>

      <Label>条件 (每行一个)</Label>
      <TextArea value={ending.conditions.join('\n')} rows={3}
        placeholder={"visited('final_choice')\nhas_item('red_key')"}
        onChange={e => updateEnding(ending.id, {
          conditions: e.target.value ? e.target.value.split('\n').map(s => s.trim()).filter(Boolean) : [],
        })} />

      <Label>叙事文本</Label>
      <TextArea value={ending.narrative} rows={3} placeholder="结局描述..."
        onChange={e => updateEnding(ending.id, { narrative: e.target.value })} />
    </div>
  );
}

function Label({ children }: { children: string }) {
  return <div style={{ fontSize: '11px', color: '#666', marginTop: '8px', marginBottom: '3px' }}>{children}</div>;
}

function Input({ value, onChange, placeholder }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string;
}) {
  return <input value={value} onChange={onChange} placeholder={placeholder}
    style={{ width: '100%', padding: '4px 6px', background: '#111', border: '1px solid #222',
      borderRadius: '3px', color: '#ccc', fontSize: '12px', boxSizing: 'border-box' }} />;
}

function TextArea({ value, onChange, rows, placeholder }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; rows: number; placeholder?: string;
}) {
  return <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
    style={{ width: '100%', padding: '4px 6px', background: '#111', border: '1px solid #222',
      borderRadius: '3px', color: '#ccc', fontSize: '12px', boxSizing: 'border-box', resize: 'vertical' }} />;
}

function Select({ value, onChange, children }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode;
}) {
  return <select value={value} onChange={onChange}
    style={{ width: '100%', padding: '4px 6px', background: '#111', border: '1px solid #222',
      borderRadius: '3px', color: '#ccc', fontSize: '12px', boxSizing: 'border-box' }}>
    {children}
  </select>;
}
