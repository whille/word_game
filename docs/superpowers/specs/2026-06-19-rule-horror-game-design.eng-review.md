# Eng Review — Rule Horror Game Design Spec

> Review of `docs/superpowers/specs/2026-06-19-rule-horror-game-design.md`
> Date: 2026-06-19

---

## Step 0: Scope Challenge

| Check | Verdict |
|-------|---------|
| 现有代码复用 | Greenfield — reasonable |
| 最小变更集 | Clean phase separation, each phase adds one dimension |
| 复杂度 | ~10 files / 4 new classes — natural decomposition, passes |
| 完整性 | Phase 1-3 detailed, Phase 4-5 appropriately high-level |

---

## 1. Architecture Review

### [P1] Missing Orchestrator (confidence: 8/10)

Data flow (click → eval → state → layout → render) has no single owner. Currently implicit in Zustand actions. Recommend explicit `useGameLoop` hook or let `NodeManager` own the orchestration.

### [P1] Conditions re-parsed on every eval (confidence: 9/10)

`ConditionParser` tokenizes strings each call. Should pre-parse at level load and cache ASTs in `ParsedLevel`. Marginal cost, prevents perf debt when node count grows in Phase 3-4.

### [P1] No ErrorBoundary for malformed levels (confidence: 9/10)

Zod catches schema errors but no error UI specified. Need:
- `<ErrorBoundary>` for render crashes
- Level load failure screen (which file, which rule has the problem)
- Condition parse failure → hide node + console.warn

### [P2] No cycle detection (confidence: 7/10)

Cyclic `children` references (A→B→A) may cause dagre to loop or produce NaN. Add Zod refinement: DFS back-edge detection at level load.

### [P2] HP/Sanity death check timing ambiguous (confidence: 7/10)

Spec says "任一归零 → 坏结局" but doesn't specify when. Recommend: check `checkEndings()` after EVERY effect application (not just node transitions).

### [P2] `clickNode` interface fuzzy (confidence: 6/10)

`clickNode(nodeId)` implies clicking a node, but the player actually clicks a connection label. Recommend:
```typescript
selectConnection(connectionIndex: number): void;
// Internally: get connection → check conditions → apply cost → set currentNodeId
```

---

## 2. Code Quality Review

### [P3] `Effect` type undefined (confidence: 9/10)

Referenced throughout spec but never defined. Presumed:
```typescript
interface Effect {
  hp?: number;
  sanity?: number;
  addItems?: string[];
  removeItems?: string[];
  setFlag?: string;
  narrative?: string;
}
```

### [P3] `RuleTrigger` type undefined (confidence: 9/10)

Rule's `triggers: RuleTrigger[]` is undefined. Presumed:
```typescript
interface RuleTrigger {
  on: 'node_enter' | 'node_exit' | 'item_use' | 'always';
  nodeId?: string;
  itemId?: string;
}
```

### [P3] `Snapshot` type undefined (confidence: 8/10)

Phase 3 core data structure needs explicit field definition.

---

## 3. Test Coverage Analysis (Phase 1)

| Code Path | Covered | Note |
|-----------|---------|------|
| ConditionParser — all functions | ✅ Spec says "fully tested" | |
| ConditionParser — nested and/or | ✅ | Need edge: empty array, single element, depth>2 |
| ConditionParser — invalid input | ❌ | Need: unknown function, syntax error, empty string |
| RuleEvaluator.getVisibleChildren | ❌ | Core logic — condition filtering |
| RuleEvaluator.checkViolations | ❌ | Violation matching + persistent effects |
| State updates (hp/sanity bounds) | ❌ | hp=0 triggers ending, sanity clamp |
| dagre layout (0/1/many children) | ❌ | Leaf nodes, start node, manual position |
| Level Zod validation | ❌ | Valid level, missing fields, type errors |

---

## 4. Performance

No concerns at Phase 1 scale. Notes for later:
- dagre full re-layout on each expand → `requestAnimationFrame` if jank appears
- Zustand selectors must scope to individual NodeCards to prevent full-tree re-renders

---

## Summary

### NOT in scope (deferred)
| Item | Reason |
|------|--------|
| Backend/DB | Static SPA design decision |
| Multiplayer | Conflicts with architecture |
| Voice/Video | Non-core |
| i18n | Chinese only for Phase 1 |
| Analytics | Phase 5 optional |
| Auto contradiction inference | Phase 2+ — explicit first |

### What already exists
Nothing. Greenfield.

### Failure Modes
| # | Failure | Test | Handler | User-Visible | Severity |
|---|---------|------|---------|-------------|----------|
| 1 | Corrupt level JSON | ❌ | ❌ | White screen | 🔴 P1 |
| 2 | Condition parse failure | ❌ | ❌ | Silent node loss | 🔴 P1 |
| 3 | dagre cyclic graph NaN | ❌ | ❌ | Nodes vanish | 🟡 P2 |
| 4 | HP/Sanity death timing | ❌ | ❌ | Logic bug | 🟡 P2 |
| 5 | localStorage quota | ❌ | ❌ | Save loss | 🟢 P3 |

### Parallelization
```
Lane 1 (Engine): ConditionParser → RuleEvaluator → NodeManager (serial deps)
Lane 2 (UI):     GameShell → StatusBar → NodeCard → ConnectionLines
Lane 3 (Data):   TS types → Zod validators → tutorial.json
```

### Implementation Tasks (Phase 1 Revised)
| ID | Task | Pri | Est |
|----|------|-----|-----|
| T1 | Scaffold: Vite + React + TS + Zustand | P1 | 0.25d |
| T2 | TS types (all interfaces including Effect, RuleTrigger, Snapshot) | P1 | 0.25d |
| T3 | Zod validators + level loader + cycle detection | P1 | 0.25d |
| T4 | ConditionParser (tokenizer + evaluator + StateResolver) | P1 | 0.75d |
| T5 | RuleEvaluator (eval, getVisibleChildren, checkViolations, findContradictions, checkEndings) | P1 | 0.5d |
| T6 | Zustand store (GameState + actions) | P1 | 0.5d |
| T7 | ErrorBoundary + LevelLoadError components | P1 | 0.25d |
| T8 | StatusBar component | P2 | 0.25d |
| T9 | NodeCard + NodeIcon + NodeContent | P1 | 0.5d |
| T10 | ConnectionLines (SVG paths) | P1 | 0.25d |
| T11 | NodeCanvas (dagre + render) | P1 | 0.5d |
| T12 | GameShell (layout container) | P1 | 0.25d |
| T13 | tutorial.json (8-10 nodes, 3 rules, 2 endings) | P2 | 0.5d |
| T14 | Integration test — click through | P1 | 0.25d |

**Revised Phase 1 total: ~5d** (original ~4d; revision reflects findings: ErrorBoundary, cycle detection, undefined types, expanded test coverage)
