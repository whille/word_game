// editor/EditorShell.tsx — Main editor layout: toolbar + canvas + side panel.
import { useState, useRef } from 'react';
import { useEditorStore } from './EditorStore';
import { EditorCanvas } from './EditorCanvas';
import { NodePanel } from './NodePanel';
import { RulePanel } from './RulePanel';
import { ItemPanel } from './ItemPanel';
import { EndingPanel } from './EndingPanel';

interface Props {
  onBack: () => void;
  onPlay: (levelJSON: string) => void;
}

export function EditorShell({ onBack, onPlay }: Props) {
  const level = useEditorStore(s => s.level);
  const selectedType = useEditorStore(s => s.selectedType);
  const selectedId = useEditorStore(s => s.selectedId);
  const isDirty = useEditorStore(s => s.isDirty);
  const addNode = useEditorStore(s => s.addNode);
  const addRule = useEditorStore(s => s.addRule);
  const addItem = useEditorStore(s => s.addItem);
  const addEnding = useEditorStore(s => s.addEnding);
  const exportJSON = useEditorStore(s => s.exportJSON);
  const initFromJSON = useEditorStore(s => s.initFromJSON);
  const validate = useEditorStore(s => s.validate);
  const clearSelection = useEditorStore(s => s.clearSelection);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const json = exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${level.meta.id || 'level'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = initFromJSON(JSON.parse(reader.result as string));
      if (!result.ok) {
        alert(`导入失败: ${result.error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleValidate = () => {
    const r = validate();
    setValidationErrors(r.errors);
    if (r.ok) alert('✅ 关卡数据验证通过');
  };

  const handlePlay = () => {
    const json = exportJSON();
    onPlay(json);
  };

  const handleAddNode = (type: 'choice' | 'clue' | 'action' | 'monster' | 'ending') => {
    addNode(type);
    clearSelection();
  };

  const selectedNode = selectedType === 'node' ? level.nodes.find(n => n.id === selectedId) : null;
  const selectedRule = selectedType === 'rule' ? level.rules.find(r => r.id === selectedId) : null;
  const selectedItem = selectedType === 'item' ? level.items.find(i => i.id === selectedId) : null;
  const selectedEnding = selectedType === 'ending' ? level.endings.find(e => e.id === selectedId) : null;

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#0a0a0a',
      color: '#ccc',
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif',
    }}>
      {/* ====== Toolbar ====== */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: '#0d0d14',
        borderBottom: '1px solid #1a1a24',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        <button onClick={onBack} style={tbBtn}>← 返回</button>
        <div style={{ width: '1px', height: '20px', background: '#333', margin: '0 4px' }} />

        <span style={{ fontSize: '13px', color: '#888' }}>添加:</span>
        <button onClick={() => handleAddNode('choice')} style={tbBtnSm}>+ 选项</button>
        <button onClick={() => handleAddNode('clue')} style={tbBtnSm}>+ 线索</button>
        <button onClick={() => handleAddNode('action')} style={tbBtnSm}>+ 行动</button>
        <button onClick={() => handleAddNode('monster')} style={tbBtnSm}>+ 怪物</button>
        <button onClick={() => handleAddNode('ending')} style={tbBtnSm}>+ 结局节点</button>
        <button onClick={addRule} style={tbBtnSm}>+ 规则</button>
        <button onClick={addItem} style={tbBtnSm}>+ 道具</button>
        <button onClick={addEnding} style={tbBtnSm}>+ 结局定义</button>

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: '12px', color: isDirty ? '#c4a56a' : '#444' }}>
          {isDirty ? '● 已修改' : '已保存'}
        </span>
        <span style={{ fontSize: '12px', color: '#555' }}>
          节点:{level.nodes.length} 规则:{level.rules.length} 道具:{level.items.length} 结局:{level.endings.length}
        </span>

        <button onClick={handleValidate} style={tbBtn}>🔍 验证</button>
        <button onClick={handleExport} style={tbBtn}>📥 导出</button>
        <button onClick={handleImport} style={tbBtn}>📤 导入</button>
        <button onClick={handlePlay} style={{...tbBtn, background: '#1a2a1a', borderColor: '#2a4a2a'}}>
          ▶ 试玩
        </button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange}
          style={{ display: 'none' }} />
      </div>

      {/* ====== Validation Errors ====== */}
      {validationErrors.length > 0 && (
        <div style={{
          padding: '8px 12px',
          background: 'rgba(255,60,60,0.1)',
          borderBottom: '1px solid rgba(255,60,60,0.25)',
          flexShrink: 0,
        }}>
          {validationErrors.map((err, i) => (
            <div key={i} style={{ color: '#ff6b6b', fontSize: '12px', lineHeight: 1.6 }}>
              ❌ {err}
            </div>
          ))}
          <button onClick={() => setValidationErrors([])}
            style={{ ...tbBtnSm, marginTop: '6px' }}>关闭</button>
        </div>
      )}

      {/* ====== Body: Canvas + Side Panel ====== */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <EditorCanvas />
        </div>

        {/* Side Panel */}
        <div style={{
          width: '320px',
          flexShrink: 0,
          overflow: 'auto',
          background: '#0d0d14',
          borderLeft: '1px solid #1a1a24',
          padding: '12px',
        }}>
          {!selectedType && (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#555', fontSize: '14px', lineHeight: 1.8 }}>
              📝 点击画布中的节点编辑属性<br />
              点击连线编辑选项条件<br />
              左侧列表管理规则/道具/结局
            </div>
          )}

          {selectedNode && (
            <NodePanel
              node={selectedNode}
              allNodeIds={level.nodes.map(n => n.id)}
              startNodeId={level.startNodeId}
            />
          )}

          {selectedRule && (
            <RulePanel rule={selectedRule} allRuleIds={level.rules.map(r => r.id)} />
          )}

          {selectedItem && (
            <ItemPanel item={selectedItem} allNodeIds={level.nodes.map(n => n.id)} />
          )}

          {selectedEnding && (
            <EndingPanel ending={selectedEnding} />
          )}

          {/* Quick list: rules/items/endings */}
          <div style={{ marginTop: '20px', borderTop: '1px solid #1a1a24', paddingTop: '12px' }}>
            <SectionHeader title="📋 规则" count={level.rules.length} />
            {level.rules.map(r => (
              <ListRow key={r.id} label={r.text || '(空规则)'} active={selectedId === r.id}
                onClick={() => useEditorStore.getState().select('rule', r.id)} />
            ))}

            <SectionHeader title="🎒 道具" count={level.items.length} style={{ marginTop: '12px' }} />
            {level.items.map(it => (
              <ListRow key={it.id} label={it.name || '(空道具)'} active={selectedId === it.id}
                onClick={() => useEditorStore.getState().select('item', it.id)} />
            ))}

            <SectionHeader title="🏁 结局" count={level.endings.length} style={{ marginTop: '12px' }} />
            {level.endings.map(e => (
              <ListRow key={e.id} label={e.name || '(空结局)'} active={selectedId === e.id}
                onClick={() => useEditorStore.getState().select('ending', e.id)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Level meta editor (title, description, author) */
function SectionHeader({ title, count, style }: { title: string; count: number; style?: React.CSSProperties }) {
  return (
    <div style={{ fontSize: '12px', color: '#777', marginBottom: '4px', fontWeight: 'bold', ...style }}>
      {title} ({count})
    </div>
  );
}

function ListRow({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{
      padding: '5px 8px',
      cursor: 'pointer',
      borderRadius: '4px',
      fontSize: '12px',
      background: active ? '#1a1a30' : 'transparent',
      color: active ? '#ccddff' : '#888',
      borderLeft: active ? '2px solid #7788bb' : '2px solid transparent',
      marginBottom: '2px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}>
      {label}
    </div>
  );
}

const tbBtn: React.CSSProperties = {
  padding: '6px 12px',
  background: '#1a1a28',
  border: '1px solid #333',
  borderRadius: '4px',
  color: '#aaa',
  cursor: 'pointer',
  fontSize: '12px',
  whiteSpace: 'nowrap',
};

const tbBtnSm: React.CSSProperties = {
  ...tbBtn,
  padding: '4px 8px',
  fontSize: '11px',
  background: '#111',
};
