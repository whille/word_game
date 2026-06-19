// ui/ErrorBoundary.tsx — Catches rendering crashes and shows error UI.
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
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
        }}>
          <h1 style={{ color: '#ff4444', marginBottom: '1rem' }}>游戏出错了</h1>
          <pre style={{
            background: '#1a1a2e',
            padding: '1rem',
            borderRadius: '8px',
            maxWidth: '600px',
            overflow: 'auto',
            fontSize: '14px',
          }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
