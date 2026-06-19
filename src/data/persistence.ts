// data/persistence.ts — localStorage persistence layer for snapshots.
// KEY: rule_horror_saves. Max 20, auto-drop oldest on overflow.

import type { Snapshot, SerializedGameState } from '../engine/types';

const SAVE_STORE = 'rule_horror_saves';
const MAX_SAVES = 20;

/** Serialized form stored in localStorage. */
interface StoredSave {
  id: string;
  nodeId: string;
  label: string;
  timestamp: number;
  state: SerializedGameState;
}

/** Load all snapshots from localStorage. */
export function loadSnapshots(): Snapshot[] {
  try {
    const raw = localStorage.getItem(SAVE_STORE);
    if (!raw) return [];
    const parsed: StoredSave[] = JSON.parse(raw);
    return parsed.map(s => ({
      id: s.id,
      nodeId: s.nodeId,
      label: s.label,
      timestamp: s.timestamp,
      state: s.state,
    }));
  } catch {
    // Corrupted data → start fresh
    localStorage.removeItem(SAVE_STORE);
    return [];
  }
}

/** Save snapshots to localStorage, enforcing MAX_SAVES cap. */
export function saveSnapshots(snapshots: Snapshot[]): void {
  const capped = snapshots.slice(-MAX_SAVES);
  const stored: StoredSave[] = capped.map(s => ({
    id: s.id,
    nodeId: s.nodeId,
    label: s.label,
    timestamp: s.timestamp,
    state: s.state,
  }));
  try {
    localStorage.setItem(SAVE_STORE, JSON.stringify(stored));
  } catch {
    // Quota exceeded — drop oldest half
    const halved = stored.slice(-Math.floor(MAX_SAVES / 2));
    try {
      localStorage.setItem(SAVE_STORE, JSON.stringify(halved));
    } catch {
      // Still can't save — give up silently
    }
  }
}

/** Delete a single snapshot by ID. Returns updated list. */
export function deleteSnapshot(snapshotId: string): Snapshot[] {
  const all = loadSnapshots();
  const filtered = all.filter(s => s.id !== snapshotId);
  saveSnapshots(filtered);
  return filtered;
}

/** Clear all saves. */
export function clearAllSaves(): void {
  localStorage.removeItem(SAVE_STORE);
}
