// ui/LevelLoadError.tsx — Error display for failed level loading.
interface Props {
  error: string;
  onRetry: () => void;
}

export function LevelLoadError({ error, onRetry }: Props) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#e0e0e0',
      fontFamily: 'system-ui, sans-serif',
      padding: '2rem',
      gap: '1rem',
    }}>
      <h1 style={{ color: '#ff4444', margin: 0 }}>关卡加载失败</h1>
      <pre style={{
        background: '#1a1a2e',
        padding: '1rem',
        borderRadius: '8px',
        maxWidth: '600px',
        overflow: 'auto',
        fontSize: '14px',
        color: '#ff7675',
      }}>
        {error}
      </pre>
      <button
        onClick={onRetry}
        style={{
          padding: '0.5rem 1rem',
          background: '#333',
          color: '#fff',
          border: '1px solid #555',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        重试
      </button>
    </div>
  );
}
