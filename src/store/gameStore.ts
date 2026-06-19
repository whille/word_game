// store/gameStore.ts — Zustand store. THE orchestrator.
// Actions call engine, mutate state, trigger UI re-renders.
// Never imports from ui/. Pure engine + state.

import { create } from 'zustand';
import type { GameState, Level, PlayerAction } from '../engine/types';
import { RuleEvaluator, applyEffect, serializeState, deserializeState } from '../engine/RuleEvaluator';

// ---- Helper: collect all descendants of a node in expandedNodes ----
function collectDescendants(
  nodeId: string,
  evaluator: RuleEvaluator,
  expanded: Set<string>,
  out: Set<string>,
): void {
  const node = evaluator.getNode(nodeId);
  if (!node) return;
  for (const child of node.children) {
    if (expanded.has(child.targetId)) {
      out.add(child.targetId);
      collectDescendants(child.targetId, evaluator, expanded, out);
    }
  }
}

// Internal store type extends GameState with actions and hidden fields
interface StoreState extends GameState {
  _evaluator: RuleEvaluator | null;

  // Actions
  initGame: (level: Level) => void;
  clickNode: (nodeId: string) => void;
  selectConnection: (connectionIndex: number) => void;
  useItem: (itemId: string, onNodeId: string) => void;
  saveSnapshot: (label: string) => void;
  restoreSnapshot: (snapshotId: string) => void;
  toggleNodeCollapse: (nodeId: string) => void;
  resetGame: () => void;
  getEvaluator: () => RuleEvaluator | null;
}

export const useGameStore = create<StoreState>((set, get) => ({
  // ---- Initial State ----
  hp: 100,
  sanity: 100,
  items: [],
  flags: new Set(),
  visitedNodes: new Set(),
  knownRules: new Map(),
  activeViolations: [],
  currentNodeId: '',
  expandedNodes: new Set(),
  snapshots: [],
  discoveredEndings: [],
	currentBackground: null,

  _evaluator: null,

  // ---- Actions ----

  initGame: (level: Level) => {
    const evaluator = new RuleEvaluator(level);
    const startNode = level.nodes.find(n => n.id === level.startNodeId);
    if (!startNode) return;

    set({
      hp: 100,
      sanity: 100,
      items: [],
      flags: new Set(),
      visitedNodes: new Set([level.startNodeId]),
      knownRules: new Map(),
      activeViolations: [],
      currentNodeId: level.startNodeId,
      expandedNodes: new Set([level.startNodeId]),
      snapshots: [],
      discoveredEndings: [],
      currentBackground: startNode.onEnter?.background ?? null,
	      _evaluator: evaluator,
    });
  },

  clickNode: (nodeId: string) => {
    const evaluator = get()._evaluator;
    if (!evaluator) return;

    const state = get();
    const node = evaluator.getNode(nodeId);
    if (!node) return;

    const updates: Partial<GameState> = {};
    const newExpanded = new Set(state.expandedNodes);

    // Mark visited
    const newVisited = new Set(state.visitedNodes);
    newVisited.add(nodeId);

    // Trigger onEnter effects
    if (node.onEnter) {
      if (node.onEnter.addItems) {
        const newItems = [...state.items];
        for (const id of node.onEnter.addItems) {
          if (!newItems.includes(id)) newItems.push(id);
        }
        updates.items = newItems;
      }
      if (node.onEnter.setFlag) {
        const newFlags = new Set(state.flags);
        newFlags.add(node.onEnter.setFlag);
        updates.flags = newFlags;
      }
      if (node.onEnter.grantsRule) {
        const rule = evaluator.getRule(node.onEnter.grantsRule);
        if (rule) {
          const newRules = new Map(state.knownRules);
          newRules.set(rule.id, rule.text);
          updates.knownRules = newRules;
        }
      }
    }

    // Check violations for entering this node
    const action: PlayerAction = { type: 'node_enter', nodeId };
    const violations = evaluator.checkViolations(action, state);
    let currentHp = updates.hp ?? state.hp;
    let currentSanity = updates.sanity ?? state.sanity;
    const currentItems = updates.items ?? [...state.items];
    const currentFlags = updates.flags ? new Set(updates.flags) : new Set(state.flags);
    const currentKnownRules = updates.knownRules
      ? new Map(updates.knownRules)
      : new Map(state.knownRules);

    // Build a temporary state for applying effects
    const tempState: GameState = {
      ...state,
      hp: currentHp,
      sanity: currentSanity,
      items: currentItems,
      flags: currentFlags,
      knownRules: currentKnownRules,
      visitedNodes: newVisited,
    };

    const newViolations = [...state.activeViolations];
    for (const v of violations) {
      applyEffect(v.immediate, tempState);
      const av = { ruleId: v.ruleId, narrative: v.narrative, persistent: v.persistent };
      newViolations.push(av);
    }

    // Check persistent ticks
    const persistentEffects = evaluator.checkPersistentTicks(action, tempState);
    for (const e of persistentEffects) {
      applyEffect(e, tempState);
    }

    // Check resolutions
    const resolved = evaluator.checkResolutions(tempState);
    const remainingViolations = newViolations.filter(av => !resolved.includes(av.ruleId));

    // Expand children
    const children = evaluator.getVisibleChildren(nodeId, tempState);
    for (const child of children) {
      newExpanded.add(child.targetId);
    }

    // Check endings (after ALL effects)
    const ending = evaluator.checkEndings(tempState);

    set({
      hp: Math.max(0, tempState.hp),
      sanity: Math.max(0, tempState.sanity),
      items: tempState.items,
      flags: tempState.flags,
      knownRules: tempState.knownRules,
      activeViolations: remainingViolations,
      currentNodeId: nodeId,
      visitedNodes: newVisited,
      expandedNodes: newExpanded,
      discoveredEndings: ending && !state.discoveredEndings.includes(ending.id)
        ? [...state.discoveredEndings, ending.id]
        : state.discoveredEndings,
      currentBackground: node.onEnter?.background ?? state.currentBackground,
    });
  },

  selectConnection: (connectionIndex: number) => {
    const state = get();
    const evaluator = (state as StoreState)._evaluator;
    if (!evaluator) return;

    const node = evaluator.getNode(state.currentNodeId);
    if (!node) return;

    const visibleChildren = evaluator.getVisibleChildren(state.currentNodeId, state);
    const connection = visibleChildren[connectionIndex];
    if (!connection) return;

    // Apply cost
    const tempState = { ...state };
    if (connection.cost) {
      if (connection.cost.hp) tempState.hp = Math.max(0, tempState.hp + connection.cost.hp);
      if (connection.cost.sanity) tempState.sanity = Math.max(0, tempState.sanity + connection.cost.sanity);
    }

    // Auto-snapshot at branch points (≥2 visible children)
    if (visibleChildren.length >= 2) {
      const snapshot = {
        id: `snap_${Date.now()}`,
        nodeId: state.currentNodeId,
        label: connection.label,
        timestamp: Date.now(),
        state: serializeState(state),
      };
      tempState.snapshots = [...state.snapshots, snapshot];
    }

    set({
      hp: tempState.hp,
      sanity: tempState.sanity,
      snapshots: tempState.snapshots,
    });

    // Navigate to the target node
    get().clickNode(connection.targetId);
  },

  useItem: (itemId: string, onNodeId: string) => {
    const state = get();
    if (!state.items.includes(itemId)) return;

    // Remove item
    const newItems = state.items.filter(id => id !== itemId);

    // Check violations for item use
    const evaluator = (state as StoreState)._evaluator;
    if (evaluator) {
      const action: PlayerAction = { type: 'item_use', nodeId: onNodeId, itemId };
      const violations = evaluator.checkViolations(action, state);
      const tempState: GameState = { ...state, items: newItems };
      for (const v of violations) {
        applyEffect(v.immediate, tempState);
      }

      // Check endings
      const ending = evaluator.checkEndings(tempState);

      set({
        items: tempState.items,
        hp: Math.max(0, tempState.hp),
        sanity: Math.max(0, tempState.sanity),
        discoveredEndings: ending && !state.discoveredEndings.includes(ending.id)
          ? [...state.discoveredEndings, ending.id]
          : state.discoveredEndings,
      });
    } else {
      set({ items: newItems });
    }
  },

  saveSnapshot: (label: string) => {
    const state = get();
    const snapshot = {
      id: `snap_${Date.now()}`,
      nodeId: state.currentNodeId,
      label,
      timestamp: Date.now(),
      state: serializeState(state),
    };
    set({ snapshots: [...state.snapshots, snapshot] });
  },

  restoreSnapshot: (snapshotId: string) => {
    const state = get();
    const snapshot = state.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) return;

    const restored = deserializeState(snapshot.state);
    set({
      ...restored,
    } as Partial<GameState>);
  },

  toggleNodeCollapse: (nodeId: string) => {
    const state = get();
    const evaluator = state._evaluator;
    if (!evaluator) return;

    const node = evaluator.getNode(nodeId);
    if (!node || node.children.length === 0) return;

    const directChildIds = node.children.map(c => c.targetId);
    const anyExpanded = directChildIds.some(id => state.expandedNodes.has(id));

    if (anyExpanded) {
      // Collapse: remove all descendants from expandedNodes
      const toRemove = new Set<string>();
      collectDescendants(nodeId, evaluator, state.expandedNodes, toRemove);
      const newExpanded = new Set(state.expandedNodes);
      for (const id of toRemove) newExpanded.delete(id);
      set({ expandedNodes: newExpanded });
    } else {
      // Expand: add visible children
      const visible = evaluator.getVisibleChildren(nodeId, state);
      const newExpanded = new Set(state.expandedNodes);
      for (const child of visible) {
        newExpanded.add(child.targetId);
      }
      set({ expandedNodes: newExpanded });
    }
  },

  resetGame: () => {
    set({
      hp: 100,
      sanity: 100,
      items: [],
      flags: new Set(),
      visitedNodes: new Set(),
      knownRules: new Map(),
      activeViolations: [],
      currentNodeId: '',
      expandedNodes: new Set(),
      snapshots: [],
      discoveredEndings: [],
      currentBackground: null,
    });
  },

  getEvaluator: () => {
    return get()._evaluator;
  },
}));
