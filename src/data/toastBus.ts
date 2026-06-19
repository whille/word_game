// data/toastBus.ts — Toast event bus (no React dependency).
// Used by store and other non-UI modules to trigger toast notifications.

interface ToastMessage {
  id: number;
  text: string;
}

let toastId = 0;
const listeners = new Set<(m: ToastMessage | null) => void>();
let currentToast: ToastMessage | null = null;

/** Show a toast message. Fades out after 2s. */
export function showToast(text: string): void {
  const msg: ToastMessage = { id: ++toastId, text };
  currentToast = msg;
  for (const fn of listeners) fn(msg);
  setTimeout(() => {
    if (currentToast?.id === msg.id) {
      currentToast = null;
      for (const fn of listeners) fn(null);
    }
  }, 2000);
}

/** Subscribe to toast state changes. Returns unsubscribe function. */
export function subscribeToast(listener: (m: ToastMessage | null) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Get current toast message (for initial state). */
export function getCurrentToast(): ToastMessage | null {
  return currentToast;
}
