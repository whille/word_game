// ============================================================
// engine/types.ts — All TypeScript interfaces for the game.
// Single source of truth. Every module imports from here.
// ============================================================

// ---- Condition Expression ----
// String form:  "has_item('key')", "sanity >= 40", "!visited('basement')"
// Object form:  { and: [...] } or { or: [...] }
export type Condition = string | { and: Condition[] } | { or: Condition[] };

// ---- Effect — stat deltas ----
export interface Effect {
  hp?: number; // delta (negative = damage, positive = heal)
  sanity?: number; // delta (negative = horror, positive = restore)
  addItems?: string[];
  removeItems?: string[];
  setFlag?: string;
  narrative?: string;
}

// ---- Rule Trigger ----
export interface RuleTrigger {
  on: 'node_enter' | 'node_exit' | 'item_use' | 'always';
  nodeId?: string; // scope to specific node
  itemId?: string; // scope to specific item
}

// ---- Rule ----
export interface RuleDef {
  id: string;
  order: number;
  text: string;
  annotation?: string;
  triggers: RuleTrigger[];
  violation: {
    condition: string; // condition expression that triggers violation
    immediate: Effect;
    persistent?: {
      tick: string; // event that triggers the tick (e.g. 'on_node_enter')
      effect: Effect;
      until: string; // resolution condition expression
    };
    narrative: string;
  };
  contradicts?: string[]; // IDs of conflicting rules
}

// ---- Connection (child edge) ----
export interface Connection {
  targetId: string;
  label: string; // text on the clickable option button
  conditions?: Condition[]; // all must be true (implicit AND)
  cost?: { hp?: number; sanity?: number };
}

// ---- Node ----
export type NodeType = 'start' | 'choice' | 'clue' | 'action' | 'monster' | 'ending';

export interface NodeDef {
  id: string;
  type: NodeType;
  content: string; // text displayed in the node card
  position?: { x: number; y: number }; // optional manual override
  children: Connection[];
  onEnter?: {
    addItems?: string[];
    setFlag?: string;
    grantsRule?: string; // reveals a rule when entered
    narrative?: string;
    effects?: Effect[];
    background?: string; // background image key (e.g. "hallway_dim")
  };
}

// ---- Item ----
export interface ItemDef {
  id: string;
  name: string;
  usableOn: string[]; // node IDs this item can be used on
  combine?: { with: string; becomes: string };
}

// ---- Ending ----
export type EndingType = 'true' | 'bad' | 'death' | 'neutral';

export interface EndingDef {
  id: string;
  name: string;
  type: EndingType;
  conditions: Condition[];
  narrative: string;
}

// ---- Level (top-level container) ----
export interface Level {
  meta: {
    id: string;
    title: string;
    author: string;
    version: number;
    description: string;
  };
  startNodeId: string;
  nodes: NodeDef[];
  rules: RuleDef[];
  items: ItemDef[];
  endings: EndingDef[];
}

// ---- Active Violation (runtime) ----
export interface ActiveViolation {
  ruleId: string;
  narrative: string;
  persistent?: {
    tick: string;
    effect: Effect;
    until: string;
  };
}

// ---- Player Action ----
export interface PlayerAction {
  type: 'node_enter' | 'node_exit' | 'item_use';
  nodeId?: string;
  itemId?: string;
}

// ---- Violation Result ----
export interface Violation {
  ruleId: string;
  narrative: string;
  immediate: Effect;
  persistent?: {
    tick: string;
    effect: Effect;
    until: string;
  };
}

// ---- Contradiction Pair ----
export interface ContradictionPair {
  ruleA: string;
  ruleB: string;
}

// ---- Snapshot (Phase 3) ----
export interface Snapshot {
  id: string;
  nodeId: string;
  label: string;
  timestamp: number;
  state: SerializedGameState;
}

// ---- Serialized State (for snapshots & saves) ----
export interface SerializedGameState {
  hp: number;
  sanity: number;
  items: string[];
  flags: string[];
  knownRules: [string, string][]; // [id, text][]
  visitedNodes: string[];
  currentNodeId: string;
  expandedNodes: string[];
  activeViolations: ActiveViolation[];
  discoveredEndings: string[];
  currentBackground: string | null;
}

// ---- Game State (runtime, with Sets/Maps) ----
export interface GameState {
  hp: number;
  sanity: number;
  items: string[];
  flags: Set<string>;
  visitedNodes: Set<string>;
  knownRules: Map<string, string>; // ruleId → rule text
  activeViolations: ActiveViolation[];
  currentNodeId: string;
  expandedNodes: Set<string>;
  snapshots: Snapshot[];
  discoveredEndings: string[];
  currentBackground: string | null;
}

// ---- Layout Node (used by NodeCanvas) ----
export interface LayoutNode {
  nodeId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// ---- Level Load Result ----
export type LevelLoadResult =
  | { ok: true; level: Level }
  | { ok: false; error: string };
