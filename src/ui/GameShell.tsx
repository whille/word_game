// ui/GameShell.tsx — Layout container. Wires StatusBar + NodeCanvas.
import { StatusBar } from './StatusBar';
import { NodeCanvas } from './NodeCanvas';

export function GameShell() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#0a0a0a',
      color: '#e0e0e0',
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif',
      overflow: 'hidden',
    }}>
      <StatusBar />
      <NodeCanvas />
    </div>
  );
}
