// editor/NodePanel.tsx — Property editor for a single node.
import { useEditorStore } from './EditorStore';
import type { NodeDef, NodeType, Connection } from '../engine/types';

interface Props {
  node: NodeDef;
  allNodeIds: string[];
  startNodeId: string;
}

const NODE_TYPES: { value: NodeType; label: string }[] = [
  { value: 'start', label: '🏁 起始' },
  { value: 'choice', label: '🔀 选择' },
  { value: 'clue', label: '📋 线索' },
  { value: 'action', label: '⚡ 行动' },
  { value: 'monster', label: '👹 怪物' },
  { value: 'ending', label: '🏁 结局' },
];

export function NodePanel({ node, allNodeIds }: Props) {
  const updateNode = useEditorStore(s => s.updateNode);
  const addConnection = useEditorStore(s => s.addConnection);
  const updateConnection = useEditorStore(s => s.updateConnection);
  const removeConnection = useEditorStore(s => s.removeConnection);
  const removeNode = useEditorStore(s => s.removeNode);
  const clearSelection = useEditorStore(s => s.clearSelection);

  return (
    <div style={{ fontSize: '13px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontWeight: 'bold', color: '#aaa' }}>节点: {node.id}</span>
        <button onClick={() => { removeNode(node.id); clearSelection(); }}
          style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '16px' }}>
          🗑️
        </button>
      </div>

      {/* Type selector */}
      <Label>类型</Label>
      <Select value={node.type} onChange={e => updateNode(node.id, { type: e.target.value as NodeType })}>
        {NODE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </Select>

      {/* Content */}
      <Label>内容</Label>
      <TextArea value={node.content} onChange={e => updateNode(node.id, { content: e.target.value })}
        rows={3} placeholder="节点文本内容..." />

      {/* OnEnter: grantsRule */}
      <Label>进入时授予规则 ID</Label>
      <Input value={node.onEnter?.grantsRule ?? ''} placeholder="rule_1"
        onChange={e => updateNode(node.id, {
          onEnter: { ...node.onEnter, grantsRule: e.target.value || undefined }
        })} />

      {/* OnEnter: setFlag */}
      <Label>进入时设置 Flag</Label>
      <Input value={node.onEnter?.setFlag ?? ''} placeholder="found_key"
        onChange={e => updateNode(node.id, {
          onEnter: { ...node.onEnter, setFlag: e.target.value || undefined }
        })} />

      {/* OnEnter: addItems */}
      <Label>进入时获得道具 (逗号分隔)</Label>
      <Input value={node.onEnter?.addItems?.join(', ') ?? ''} placeholder="flashlight, keycard"
        onChange={e => updateNode(node.id, {
          onEnter: {
            ...node.onEnter,
            addItems: e.target.value ? e.target.value.split(',').map(s => s.trim()) : undefined,
          }
        })} />

      {/* OnEnter: background */}
      <Label>进入时背景图 key</Label>
      <Input value={node.onEnter?.background ?? ''} placeholder="hallway_dim"
        onChange={e => updateNode(node.id, {
          onEnter: { ...node.onEnter, background: e.target.value || undefined }
        })} />

      {/* OnEnter: narrative */}
      <Label>旁白</Label>
      <Input value={node.onEnter?.narrative ?? ''} placeholder="进入时的旁白文字"
        onChange={e => updateNode(node.id, {
          onEnter: { ...node.onEnter, narrative: e.target.value || undefined }
        })} />

      {/* Children / Connections */}
      <div style={{ marginTop: '16px', borderTop: '1px solid #1a1a24', paddingTop: '12px' }}>
        <Label>子节点 (选项)</Label>
        {node.children.map((child, idx) => (
          <ConnectionRow
            key={idx}
            conn={child}
            allNodeIds={allNodeIds}
            nodeId={node.id}
            onUpdate={(p) => updateConnection(node.id, idx, p)}
            onRemove={() => removeConnection(node.id, idx)}
          />
        ))}
        <button onClick={() => addConnection(node.id, '', '新选项')}
          style={addBtn}>+ 添加选项</button>
      </div>
    </div>
  );
}

function ConnectionRow({ conn, allNodeIds, nodeId, onUpdate, onRemove }: {
  conn: Connection; allNodeIds: string[]; nodeId: string;
  onUpdate: (p: Partial<Connection>) => void; onRemove: () => void;
}) {
  return (
    <div style={{
      background: '#111118', borderRadius: '4px', padding: '6px', marginBottom: '6px',
      border: '1px solid #1a1a24',
    }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
        <Select value={conn.targetId} onChange={e => onUpdate({ targetId: e.target.value })}
          style={{ flex: 1, fontSize: '11px' }}>
          <option value="">选择目标...</option>
          {allNodeIds.filter(id => id !== nodeId).map(id => (
            <option key={id} value={id}>{id}</option>
          ))}
        </Select>
        <button onClick={onRemove} style={{ ...addBtn, color: '#ff6b6b', flexShrink: 0 }}>✕</button>
      </div>
      <Input value={conn.label} placeholder="选项标签"
        onChange={e => onUpdate({ label: e.target.value })}
        style={{ fontSize: '11px' }} />
      <Input value={conn.conditions?.join('; ') ?? ''} placeholder="条件 (分号分隔，如: has_item('key'))"
        onChange={e => onUpdate({
          conditions: e.target.value ? e.target.value.split(';').map(s => s.trim()) : undefined,
        })}
        style={{ fontSize: '11px', marginTop: '2px' }} />
    </div>
  );
}

// ---- Shared form components ----
function Label({ children }: { children: string }) {
  return <div style={{ fontSize: '11px', color: '#666', marginTop: '8px', marginBottom: '3px' }}>{children}</div>;
}

function Input({ value, onChange, placeholder, style }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; style?: React.CSSProperties;
}) {
  return <input value={value} onChange={onChange} placeholder={placeholder}
    style={{
      width: '100%', padding: '4px 6px', background: '#111', border: '1px solid #222',
      borderRadius: '3px', color: '#ccc', fontSize: '12px', boxSizing: 'border-box', ...style,
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

function Select({ value, onChange, children, style }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return <select value={value} onChange={onChange}
    style={{
      width: '100%', padding: '4px 6px', background: '#111', border: '1px solid #222',
      borderRadius: '3px', color: '#ccc', fontSize: '12px', boxSizing: 'border-box', ...style,
    }}>{children}</select>;
}

const addBtn: React.CSSProperties = {
  padding: '4px 10px',
  background: 'none',
  border: '1px dashed #333',
  borderRadius: '4px',
  color: '#777',
  cursor: 'pointer',
  fontSize: '11px',
  marginTop: '4px',
};
