# Rule Horror Game — Design Spec

> 规则怪谈树形文字交互游戏。Web 原生、JSON 驱动、移动优先。
> 参考：Steam《文字规则怪谈》(Myths of Rules) 及 `docs/reference/game-analysis.md`

**Date:** 2026-06-19
**Status:** Draft

---

## 1. Context

Building a rule-horror (规则怪谈) text adventure game where players navigate a tree of clickable text nodes, discover contradictory rules, and find the safe path through logic. The Steam game *Myths of Rules* proved the concept but has pain points: no branch snapshots, UI clutter, replay friction, no mobile.

This project is a **Web-first alternative** — zero install, URL-shareable, mobile-responsive — with better save/replay ergonomics and a cleaner engine architecture.

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | React 19 + TypeScript | Component model maps to nodes; hooks for state; largest ecosystem |
| Build | Vite | Fast HMR, zero-config TS, CSS modules |
| State | Zustand | ~1KB, no providers, selector-based re-render control |
| Graph Layout | dagre + SVG | Directed acyclic graph layout; SVG `<path>` for chalk-line connections |
| Drag & Drop | @dnd-kit/core | Modern, accessible, touch-compatible |
| CSS | CSS Modules + @keyframes | Scoped styles; text effects via animation |
| Persistence | localStorage + IndexedDB | localStorage for current save; IndexedDB for snapshot history |
| Level Loading | Dynamic `import()` | URL param `?level=xxx` for sharing; can fetch from any URL |
| Deploy | CloudFlare Pages / Vercel | Static SPA, zero server cost |

---

## 3. Architecture

### 3.1 Layer Diagram

```
UI Layer (React Components)
├── GameShell        — layout container
├── StatusBar        — HP/Sanity animated bars
├── NodeCanvas       — renders node tree + SVG connection lines
│   ├── ConnectionLines — SVG <path> chalk lines
│   └── NodeCard[]   — clickable text nodes
├── Inventory        — draggable item slots
├── Notebook         — slide-out panel for discovered rules
├── BranchMap        — explored path minimap (Phase 3)
└── MainMenu         — level select, load save

Engine Layer (Core Logic)
├── RuleEvaluator    — condition eval, violation check, contradiction detection
├── StateResolver    — pure lookups on GameState (has_item, has_flag, etc.)
├── NodeManager      — expand/collapse, snapshot creation, layout trigger
└── ConditionParser  — string → token → boolean

Data Layer
├── LevelSchema      — TypeScript types + Zod validators
├── SaveFormat       — snapshot serialization
└── levels/*.json    — level files
```

### 3.2 Data Flow (One Click)

```
User clicks NodeCard
  → RuleEvaluator.eval(conditions, state) → getVisibleChildren
  → RuleEvaluator.checkViolations(action, state) → apply effects
  → State store update (hp, sanity, items, visitedNodes, flags)
  → NodeManager.expand(nodeId) → dagre layout → new nodes
  → React re-render (animated transitions)
```

### 3.3 Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Node layout | Hybrid: auto (dagre) by default, optional `position: {x, y}` override | Authoring speed + precision when needed |
| Contradiction detection | Explicit: author marks `"contradicts": ["rule_X"]` | 100% reliable; inferred detection is Phase 2 |
| Condition language | String mini-DSL: `has_item('x')`, `sanity >= 40`, nested `{and/or}` | Readable in JSON, easy to parse, expressive enough |
| Save granularity | Auto-snapshot at branch points + manual save anywhere | Balances safety with replay convenience |
| Backend | None — pure static SPA | Zero cost, no auth, no server to maintain |

---

## 4. Data Model

### 4.1 Level JSON Schema

```typescript
interface Level {
  meta: {
    id: string;          // unique slug
    title: string;       // display name
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
```

### 4.2 Node Definition

```typescript
interface NodeDef {
  id: string;
  type: 'start' | 'choice' | 'clue' | 'action' | 'monster' | 'ending';
  content: string;           // text displayed in the node card
  position?: { x: number; y: number };  // optional manual override
  children: Connection[];
  onEnter?: {
    addItems?: string[];
    setFlag?: string;
    grantsRule?: string;
    narrative?: string;
    effects?: Effect[];
  };
}

interface Connection {
  targetId: string;
  label: string;             // text on the clickable option
  conditions?: Condition[];  // gates — all must be true
  cost?: { hp?: number; sanity?: number };
}
```

### 4.3 Rule Definition

```typescript
interface RuleDef {
  id: string;
  order: number;             // display order in notebook
  text: string;              // rule text
  annotation?: string;       // secondary layer (small text, struck-through, etc.)
  triggers: RuleTrigger[];
  violation: {
    condition: string;       // condition expression that triggers violation
    immediate: Effect;       // instant penalty
    persistent?: {           // ongoing effect
      tick: string;          // event that triggers the tick
      effect: Effect;
      until: string;         // resolution condition
    };
    narrative: string;       // flavor text when violated
  };
  contradicts?: string[];    // IDs of conflicting rules
}
```

### 4.4 Condition Expression Mini-Language

```
// Built-in functions
has_item('id')      — item is in inventory
has_flag('name')    — boolean flag is set
knows_rule('id')    — rule has been discovered
visited('nodeId')   — node has been visited

// Stat comparisons
sanity >= 40
hp < 20

// Negation
!has_item('flashlight')

// Nesting (max 2 levels)
{ "and": ["cond1", { "or": ["cond2", "cond3"] }] }

// In JSON, array = implicit AND
"conditions": ["has_item('key')", "sanity >= 50"]           // AND
"conditions": [{"or": ["has_item('key')", "sanity >= 50"]}] // OR
```

### 4.5 Item & Ending

```typescript
interface ItemDef {
  id: string;
  name: string;
  usableOn: string[];        // node IDs this item can be used on
  combine?: { with: string; becomes: string };  // item combination
}

interface EndingDef {
  id: string;
  name: string;
  type: 'true' | 'bad' | 'death' | 'neutral';
  conditions: Condition[];
  narrative: string;
}
```

---

## 5. Rule Engine Design

### 5.1 Core API

```typescript
class RuleEvaluator {
  eval(condition: string, state: GameState): boolean;
  getVisibleChildren(nodeId: string, state: GameState): Connection[];
  checkViolations(action: PlayerAction, state: GameState): Violation[];
  findContradictions(state: GameState): ContradictionPair[];
  checkEndings(state: GameState): Ending | null;
}
```

### 5.2 Condition Parser

Two-pass parser:
1. **Tokenize**: extract function calls, operators, comparisons from string
2. **Evaluate**: resolve each token against `StateResolver` (pure lookups on GameState)

`StateResolver` maps function names to pure lookups:
- `has_item(id)` → `state.items.includes(id)`
- `has_flag(f)` → `state.flags.has(f)`
- `knows_rule(r)` → `state.knownRules.has(r)`
- `visited(n)` → `state.visitedNodes.has(n)`
- `sanity` / `hp` → direct property access

### 5.3 Rule Lifecycle

```
undiscovered → discovered (grantsRule / read clue node)
                   ↓
         complying ←→ violating
                         ↓
                   active violation (persistent effects until resolved)
                         ↓
                      resolved (player finds fix)
```

### 5.4 Contradiction Display

When player has discovered ≥2 rules where one's `contradicts` array contains the other's ID, UI shows a subtle ⚡ indicator: "这些规则之间似乎存在矛盾" — but never explains the resolution. Player must deduce.

---

## 6. Component Tree

```
App
├── GameShell
│   ├── StatusBar          — HP + Sanity animated bars
│   ├── NodeCanvas         — core: renders node tree + connections
│   │   ├── ConnectionLines — SVG <path> chalk lines
│   │   └── NodeCard[]     — each clickable text node
│   │       ├── NodeIcon   — type indicator
│   │       └── NodeContent — text with CSS effects
│   ├── Inventory          — draggable item slots
│   │   └── ItemSlot[]
│   ├── Notebook           — slide-out rules panel
│   └── BranchMap          — explored path minimap (Phase 3)
├── MainMenu               — level select, continue, load
└── LevelEditor            — (Phase 4)
```

### 6.1 State Shape (Zustand)

```typescript
interface GameState {
  hp: number;
  sanity: number;
  items: string[];
  flags: Set<string>;
  visitedNodes: Set<string>;
  knownRules: Map<string, string>;
  activeViolations: ActiveViolation[];
  currentNodeId: string;
  expandedNodes: Set<string>;
  snapshots: Snapshot[];
  discoveredEndings: string[];

  // Actions
  clickNode: (nodeId: string) => void;
  useItem: (itemId: string, onNodeId: string) => void;
  restoreSnapshot: (snapshotId: string) => void;
  resetGame: () => void;
}
```

---

## 7. Development Phases

### Phase 1: MVP — Core Loop (~4 days)

**Goal:** One person can click through a 5-minute horror story.

| Module | Deliverable |
|--------|-------------|
| Scaffold | Vite + React + TS + Zustand |
| Schema | TS types + Zod validators for level JSON |
| ConditionParser | String → token → boolean, fully tested |
| NodeTree | NodeCard + ConnectionLines + dagre layout + click expand |
| StateMachine | Zustand store: hp/sanity/items/flags/visitedNodes |
| StatusBar | Animated HP/Sanity bars |
| Mini Level | `tutorial.json` — 8-10 nodes, 3 rules, 2 endings |
| Integration | Click through end-to-end |

**Success test:** Open browser → see start node → click → read rules → make choice → reach ending.

### Phase 2: Full Level (~2 days)

**Goal:** Complete 15-30 min horror experience.

| Module | Deliverable |
|--------|-------------|
| Inventory | Draggable items with @dnd-kit, highlight valid targets |
| Notebook | Slide-out rules panel |
| CSS Effects | flicker, blur, color-shift keyframes |
| Sound | Web Audio API ambient tones + stingers |
| Contradiction Hints | ⚡ indicator for discovered contradictions |
| Full Level | `apartment_night.json` — ~25 nodes, 7 rules, 3-4 endings |

### Phase 3: Branch Snapshots (~2 days)

**Goal:** Eliminate replay friction — the key differentiator from Steam version.

| Module | Deliverable |
|--------|-------------|
| Auto-snapshot | Every node with ≥2 children auto-saves state |
| BranchMap | SVG minimap, click to jump, dashed unexplored paths |
| Quick Restore | One-click restore from snapshot |
| Ending Gallery | Discovered endings with unlock status |

### Phase 4: Level Editor (~4 days)

**Goal:** Non-programmers can create levels.

| Module | Deliverable |
|--------|-------------|
| Visual Editor | Drag nodes, draw connections (React Flow or custom SVG) |
| Rule Editor | Form UI for rules with triggers/effects |
| Playtest Mode | In-editor playthrough with path coverage report |
| Export/Import | Download JSON, import from URL, share button |
| Validator | Unreachable node detection, dead-end check |

### Phase 5: Deploy & Polish (~1 day)

| Module | Deliverable |
|--------|-------------|
| Deploy | CloudFlare Pages / Vercel |
| Mobile | Responsive pass, touch targets |
| PWA | manifest.json + service worker |

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Condition DSL too limited | Extensible — new functions added to StateResolver |
| dagre layout doesn't look good for some trees | Hybrid model allows manual `position` overrides |
| Writing a good level is hard | Editor (Phase 4) + validator lowers barrier |
| Mobile touch targets too small | Phase 5 responsive pass; dnd-kit handles touch |
| No backend = no multiplayer / cloud save | URL params + JSON import covers sharing; localStorage is fine for save |

---

## 9. Verification

### Phase 1 Verification
1. `npm run dev` → browser shows start node
2. Click through tutorial level → all branches reachable
3. Stat changes animate on StatusBar
4. Condition tests: `has_item('x')`, `sanity >= N`, `!condition`, nested `{and/or}` all pass

### Phase 2 Verification
1. Drag item from inventory to target node → item consumed, effect applied
2. Notebook shows discovered rules with contradiction markers
3. All 3-4 endings reachable in full level
4. CSS text effects render without jank on mobile viewport

### Phase 3 Verification
1. Die → "Return to last branch" button appears → restores state correctly
2. BranchMap shows explored paths; unexplored paths are dashed
3. Click unexplored dashed node → jumps there with correct state
4. Complete all endings → gallery shows 100%

---

## 10. References

- Steam《文字规则怪谈》: https://store.steampowered.com/app/2539350/
- Analysis doc: `docs/reference/game-analysis.md`
- Brainstorming screens: `.superpowers/brainstorm/43329-1781862482/content/`
