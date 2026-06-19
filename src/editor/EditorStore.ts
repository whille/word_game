// editor/EditorStore.ts — Zustand store for the level editor.
// Manages a mutable draft copy of the level being edited.
import { create } from 'zustand';
import type { Level, NodeDef, RuleDef, ItemDef, EndingDef, Connection, NodeType } from '../engine/types';
import { loadLevel } from '../data/schema';

// Default empty level template
function blankLevel(title: string): Level {
  const startId = 'start';
  return {
    meta: { id: 'custom_level', title, author: 'Custom', version: 1, description: '' },
    startNodeId: startId,
    nodes: [{
      id: startId, type: 'start', content: '新的冒险开始...', children: [],
    }],
    rules: [],
    items: [],
    endings: [],
  };
}

/** All state lives here — no intermediate form state in UI components */
interface EditorState {
  // Draft level
  level: Level;

  // Selection
  selectedType: 'node' | 'rule' | 'item' | 'ending' | null;
  selectedId: string | null;

  // UI
  isDirty: boolean;

  // Actions
  initBlank: (title: string) => void;
  initFromJSON: (json: unknown) => { ok: boolean; error?: string };
  loadFromLevel: (level: Level) => void;
  exportJSON: () => string;

  // Node mutations
  updateNode: (id: string, patch: Partial<NodeDef>) => void;
  addNode: (type: NodeType, x?: number, y?: number) => string;
  removeNode: (id: string) => void;
  addConnection: (fromId: string, toId: string, label: string) => void;
  updateConnection: (fromId: string, idx: number, patch: Partial<Connection>) => void;
  removeConnection: (fromId: string, idx: number) => void;

  // Rule mutations
  updateRule: (id: string, patch: Partial<RuleDef>) => void;
  addRule: () => string;
  removeRule: (id: string) => void;

  // Item mutations
  updateItem: (id: string, patch: Partial<ItemDef>) => void;
  addItem: () => string;
  removeItem: (id: string) => void;

  // Ending mutations
  updateEnding: (id: string, patch: Partial<EndingDef>) => void;
  addEnding: () => string;
  removeEnding: (id: string) => void;

  // Selection
  select: (type: 'node' | 'rule' | 'item' | 'ending', id: string) => void;
  clearSelection: () => void;

  // Validation
  validate: () => { ok: boolean; errors: string[] };
}

let nextId = 1;
function uid(prefix: string) {
  return `${prefix}_${nextId++}_${Date.now().toString(36)}`;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  level: blankLevel('新关卡'),
  selectedType: null,
  selectedId: null,
  isDirty: false,

  initBlank: (title) => {
    nextId = 1;
    set({ level: blankLevel(title), selectedType: null, selectedId: null, isDirty: false });
  },

  initFromJSON: (json) => {
    const result = loadLevel(json);
    if (!result.ok) return { ok: false, error: result.error };
    nextId = 1;
    set({ level: result.level, selectedType: null, selectedId: null, isDirty: false });
    return { ok: true };
  },

  loadFromLevel: (level) => {
    nextId = 1;
    set({ level: JSON.parse(JSON.stringify(level)), selectedType: null, selectedId: null, isDirty: false });
  },

  exportJSON: () => {
    const level = get().level;
    return JSON.stringify(level, null, 2);
  },

  // ── Node ──
  updateNode: (id, patch) => {
    set(s => {
      const nodes = s.level.nodes.map(n => n.id === id ? { ...n, ...patch } : n);
      return { level: { ...s.level, nodes }, isDirty: true };
    });
  },

  addNode: (type, x, y) => {
    const id = uid('node');
    set(s => ({
      level: {
        ...s.level,
        nodes: [...s.level.nodes, {
          id, type, content: '', children: [],
          ...(x !== undefined && y !== undefined ? { position: { x, y } } : {}),
        }],
      },
      isDirty: true,
    }));
    return id;
  },

  removeNode: (id) => {
    set(s => {
      // Remove self + prune children references
      let nodes = s.level.nodes.filter(n => n.id !== id);
      // Prune connections pointing to removed node
      nodes = nodes.map(n => ({
        ...n,
        children: n.children.filter(c => c.targetId !== id),
      }));
      // Update startNodeId if needed
      const meta = s.level.startNodeId === id
        ? { ...s.level.meta, startNodeId: nodes[0]?.id ?? 'start' }
        : s.level.meta;
      return {
        level: { ...s.level, nodes, meta },
        selectedType: s.selectedType === 'node' && s.selectedId === id ? null : s.selectedType,
        selectedId: s.selectedType === 'node' && s.selectedId === id ? null : s.selectedId,
        isDirty: true,
      };
    });
  },

  addConnection: (fromId, toId, label) => {
    set(s => ({
      level: {
        ...s.level,
        nodes: s.level.nodes.map(n =>
          n.id === fromId ? { ...n, children: [...n.children, { targetId: toId, label }] } : n
        ),
      },
      isDirty: true,
    }));
  },

  updateConnection: (fromId, idx, patch) => {
    set(s => ({
      level: {
        ...s.level,
        nodes: s.level.nodes.map(n => {
          if (n.id !== fromId) return n;
          const children = [...n.children];
          children[idx] = { ...children[idx], ...patch };
          return { ...n, children };
        }),
      },
      isDirty: true,
    }));
  },

  removeConnection: (fromId, idx) => {
    set(s => ({
      level: {
        ...s.level,
        nodes: s.level.nodes.map(n =>
          n.id === fromId ? { ...n, children: n.children.filter((_, i) => i !== idx) } : n
        ),
      },
      isDirty: true,
    }));
  },

  // ── Rule ──
  updateRule: (id, patch) => {
    set(s => ({
      level: {
        ...s.level,
        rules: s.level.rules.map(r => r.id === id ? { ...r, ...patch } : r),
      },
      isDirty: true,
    }));
  },

  addRule: () => {
    const id = uid('rule');
    const order = get().level.rules.length + 1;
    set(s => ({
      level: {
        ...s.level,
        rules: [...s.level.rules, {
          id, order, text: '',
          triggers: [{ on: 'node_enter' }],
          violation: { condition: '', immediate: {}, narrative: '' },
        }],
      },
      isDirty: true,
    }));
    return id;
  },

  removeRule: (id) => {
    set(s => ({
      level: {
        ...s.level,
        rules: s.level.rules.filter(r => r.id !== id),
      },
      selectedType: s.selectedType === 'rule' && s.selectedId === id ? null : s.selectedType,
      selectedId: s.selectedType === 'rule' && s.selectedId === id ? null : s.selectedId,
      isDirty: true,
    }));
  },

  // ── Item ──
  updateItem: (id, patch) => {
    set(s => ({
      level: {
        ...s.level,
        items: s.level.items.map(i => i.id === id ? { ...i, ...patch } : i),
      },
      isDirty: true,
    }));
  },

  addItem: () => {
    const id = uid('item');
    set(s => ({
      level: {
        ...s.level,
        items: [...s.level.items, { id, name: '', usableOn: [] }],
      },
      isDirty: true,
    }));
    return id;
  },

  removeItem: (id) => {
    set(s => ({
      level: {
        ...s.level,
        items: s.level.items.filter(i => i.id !== id),
      },
      selectedType: s.selectedType === 'item' && s.selectedId === id ? null : s.selectedType,
      selectedId: s.selectedType === 'item' && s.selectedId === id ? null : s.selectedId,
      isDirty: true,
    }));
  },

  // ── Ending ──
  updateEnding: (id, patch) => {
    set(s => ({
      level: {
        ...s.level,
        endings: s.level.endings.map(e => e.id === id ? { ...e, ...patch } : e),
      },
      isDirty: true,
    }));
  },

  addEnding: () => {
    const id = uid('ending');
    set(s => ({
      level: {
        ...s.level,
        endings: [...s.level.endings, {
          id, name: '', type: 'neutral', conditions: [], narrative: '',
        }],
      },
      isDirty: true,
    }));
    return id;
  },

  removeEnding: (id) => {
    set(s => ({
      level: {
        ...s.level,
        endings: s.level.endings.filter(e => e.id !== id),
      },
      selectedType: s.selectedType === 'ending' && s.selectedId === id ? null : s.selectedType,
      selectedId: s.selectedType === 'ending' && s.selectedId === id ? null : s.selectedId,
      isDirty: true,
    }));
  },

  // ── Selection ──
  select: (type, id) => set({ selectedType: type, selectedId: id }),
  clearSelection: () => set({ selectedType: null, selectedId: null }),

  // ── Validate ──
  validate: () => {
    const level = get().level;
    const errors: string[] = [];

    // Start node exists
    if (!level.nodes.find(n => n.id === level.startNodeId)) {
      errors.push(`起始节点 "${level.startNodeId}" 不存在`);
    }

    // All connection targets exist
    const nodeIds = new Set(level.nodes.map(n => n.id));
    for (const node of level.nodes) {
      for (const child of node.children) {
        if (!nodeIds.has(child.targetId)) {
          errors.push(`节点 "${node.id}" 引用不存在的目标 "${child.targetId}"`);
        }
        if (!child.label.trim()) {
          errors.push(`节点 "${node.id}" 的选项缺少标签`);
        }
      }
    }

    // Rule contradicts references
    const ruleIds = new Set(level.rules.map(r => r.id));
    for (const rule of level.rules) {
      if (rule.contradicts) {
        for (const cid of rule.contradicts) {
          if (!ruleIds.has(cid)) {
            errors.push(`规则 "${rule.id}" 矛盾引用了不存在的规则 "${cid}"`);
          }
        }
      }
    }

    // Endings must have conditions
    for (const ending of level.endings) {
      if (ending.conditions.length === 0) {
        errors.push(`结局 "${ending.name || ending.id}" 缺少条件`);
      }
    }

    return { ok: errors.length === 0, errors };
  },
}));
