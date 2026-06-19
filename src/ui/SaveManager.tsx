// ui/SaveManager.tsx — Save slot manager panel.
// Lists snapshots, click to restore, right-click to delete.
import { useGameStore } from '../store/gameStore';
import { deleteSnapshot } from '../data/persistence';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/** Format a timestamp as locale date-time string. */
function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SaveManager({ isOpen, onClose }: Props) {
  const snapshots = useGameStore(s => s.snapshots);
  const evaluator = useGameStore(s => s.getEvaluator());
  const restoreSnapshot = useGameStore(s => s.restoreSnapshot);
  const saveSnapshot = useGameStore(s => s.saveSnapshot);
  const currentNodeId = useGameStore(s => s.currentNodeId);

  if (!isOpen) return null;

  const getNodeName = (nodeId: string) => {
    const node = evaluator?.getNode(nodeId);
    return node ? node.content.slice(0, 20) : nodeId;
  };

  const handleRestore = (snapId: string) => {
    if (confirm('确定要读取此存档吗？当前进度将被替换。')) {
      restoreSnapshot(snapId);
      onClose();
    }
  };

  const handleDelete = (snapId: string) => {
    // Update store + localStorage
    const store = useGameStore.getState();
    const filtered = store.snapshots.filter(s => s.id !== snapId);
    deleteSnapshot(snapId);
    useGameStore.setState({ snapshots: filtered });
  };

  const handleContextMenu = (e: React.MouseEvent, snapId: string) => {
    e.preventDefault();
    if (confirm('确定要删除此存档吗？')) {
      handleDelete(snapId);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 29,
        }}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 30,
        background: '#12121c',
        border: '1px solid #2a2a35',
        borderRadius: '10px',
        padding: '20px',
        minWidth: '340px',
        maxWidth: '420px',
        maxHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}>
          <h3 style={{ color: '#c4a56a', fontSize: '16px', margin: 0 }}>💾 存档管理</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                const node = evaluator?.getNode(currentNodeId);
                saveSnapshot(node ? node.content.slice(0, 16) : '手动存档');
              }}
              title="手动存档"
              style={{
                background: 'rgba(100,150,200,0.1)',
                border: '1px solid #2a2a40',
                borderRadius: '4px',
                color: '#8899cc',
                cursor: 'pointer',
                fontSize: '12px',
                padding: '4px 10px',
              }}
            >
              + 手动存档
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0 4px',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {snapshots.length === 0 ? (
            <p style={{ color: '#555', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
              暂无存档
            </p>
          ) : (
            [...snapshots].reverse().map(snap => (
              <div
                key={snap.id}
                onClick={() => handleRestore(snap.id)}
                onContextMenu={e => handleContextMenu(e, snap.id)}
                title="左键读档 | 右键删除"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderBottom: '1px solid #1a1a28',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#1a1a2e'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
              >
                <div>
                  <div style={{ color: '#ccc', fontSize: '13px' }}>
                    {getNodeName(snap.nodeId)}
                  </div>
                  <div style={{ color: '#555', fontSize: '11px', marginTop: '3px' }}>
                    {formatTime(snap.timestamp)} · {snap.label}
                  </div>
                </div>
                <span
                  onClick={e => {
                    e.stopPropagation();
                    handleDelete(snap.id);
                  }}
                  title="删除"
                  style={{
                    color: '#555',
                    cursor: 'pointer',
                    fontSize: '13px',
                    padding: '4px',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ff6666'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#555'; }}
                >
                  🗑
                </span>
              </div>
            ))
          )}
        </div>

        <div style={{
          color: '#444',
          fontSize: '10px',
          textAlign: 'center',
          marginTop: '12px',
        }}>
          最多 20 个存档 · 左键读档 · 右键删除
        </div>
      </div>
    </>
  );
}
