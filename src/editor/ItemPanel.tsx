// editor/ItemPanel.tsx — Property editor for an item.
import { useEditorStore } from './EditorStore';
import type { ItemDef } from '../engine/types';

interface Props {
  item: ItemDef;
  allNodeIds: string[];
}

export function ItemPanel({ item }: Props) {
  const updateItem = useEditorStore(s => s.updateItem);
  const removeItem = useEditorStore(s => s.removeItem);
  const clearSelection = useEditorStore(s => s.clearSelection);

  return (
    <div style={{ fontSize: '13px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontWeight: 'bold', color: '#aaa' }}>道具: {item.id}</span>
        <button onClick={() => { removeItem(item.id); clearSelection(); }}
          style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '16px' }}>🗑️</button>
      </div>

      <Label>名称</Label>
      <Input value={item.name} placeholder="道具名称"
        onChange={e => updateItem(item.id, { name: e.target.value })} />

      <Label>可用目标节点 (逗号分隔)</Label>
      <TextArea value={item.usableOn.join(', ')} rows={3} placeholder="node_1, node_2"
        onChange={e => updateItem(item.id, {
          usableOn: e.target.value ? e.target.value.split(',').map(s => s.trim()) : [],
        })} />

      <Label>合成材料 (with)</Label>
      <Input value={item.combine?.with ?? ''} placeholder="battery"
        onChange={e => updateItem(item.id, {
          combine: e.target.value ? { with: e.target.value, becomes: item.combine?.becomes ?? '' } : undefined,
        })} />

      <Label>合成产物 (becomes)</Label>
      <Input value={item.combine?.becomes ?? ''} placeholder="charged_flashlight"
        onChange={e => updateItem(item.id, {
          combine: item.combine ? { ...item.combine, becomes: e.target.value } : undefined,
        })} />
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
