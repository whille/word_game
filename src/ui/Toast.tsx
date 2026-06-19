// ui/Toast.tsx — Toast React component.
// Uses the toast bus from data/toastBus.ts for state management.
import { useEffect, useState } from 'react';
import { subscribeToast, getCurrentToast } from '../data/toastBus';
import type { } from '../data/toastBus'; // suppress empty-import warning

interface ToastMessage {
  id: number;
  text: string;
}

export function ToastContainer() {
  const [msg, setMsg] = useState<ToastMessage | null>(getCurrentToast());

  useEffect(() => {
    return subscribeToast((m) => setMsg(m));
  }, []);

  if (!msg) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(20, 20, 40, 0.92)',
      border: '1px solid #444',
      borderRadius: '8px',
      padding: '10px 22px',
      color: '#8899cc',
      fontSize: '14px',
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif',
      zIndex: 1000,
      pointerEvents: 'none',
      animation: 'toastFadeIn 0.3s ease-out',
      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    }}>
      {msg.text}
    </div>
  );
}
