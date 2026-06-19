// engine/RuleEvaluator.ts — Core rule engine.
// Evaluates conditions, checks violations, finds contradictions, checks endings.
// Pure logic — depends on ConditionParser and types.

import type {
  GameState, Level, Connection, Violation,
  ContradictionPair, PlayerAction, Effect, EndingDef,
} from './types';
import { evaluateCondition, allConditionsMet } from './ConditionParser';

// ---- Helper: apply effect to state ----
export function applyEffect(effect: Effect, state: GameState): void {
  if (effect.hp !== undefined) state.hp += effect.hp;
  if (effect.sanity !== undefined) state.sanity += effect.sanity;
  if (effect.addItems) {
    for (const id of effect.addItems) {
      if (!state.items.includes(id)) state.items.push(id);
    }
  }
  if (effect.removeItems) {
    state.items = state.items.filter(id => !effect.removeItems!.includes(id));
  }
  if (effect.setFlag) state.flags.add(effect.setFlag);
}

// ---- RuleEvaluator ----
export class RuleEvaluator {
  private level: Level;

  constructor(level: Level) {
    this.level = level;
  }

  /** Evaluate a single condition against state. */
  evalCondition(condition: string, state: GameState): boolean {
    return evaluateCondition(condition, state);
  }

  /** Get children of a node that pass their conditions. */
  getVisibleChildren(nodeId: string, state: GameState): Connection[] {
    const node = this.level.nodes.find(n => n.id === nodeId);
    if (!node) return [];
    return node.children.filter(child => allConditionsMet(child.conditions, state));
  }

  /** Check if entering/exiting/using triggers any rule violations. */
  checkViolations(action: PlayerAction, state: GameState): Violation[] {
    const violations: Violation[] = [];

    for (const rule of this.level.rules) {
      // Only check rules the player has discovered
      if (!state.knownRules.has(rule.id)) continue;

      // Check if any trigger matches
      const triggered = rule.triggers.some(t => {
        if (t.on !== action.type) return false;
        if (t.nodeId && t.nodeId !== action.nodeId) return false;
        if (t.itemId && t.itemId !== action.itemId) return false;
        return true;
      });
      if (!triggered) continue;

      // Check violation condition
      const violated = evaluateCondition(rule.violation.condition, state);
      if (!violated) continue;

      violations.push({
        ruleId: rule.id,
        narrative: rule.violation.narrative,
        immediate: rule.violation.immediate,
        persistent: rule.violation.persistent,
      });
    }

    return violations;
  }

  /** Check for persistent violation ticks. */
  checkPersistentTicks(action: PlayerAction, state: GameState): Effect[] {
    const effects: Effect[] = [];
    for (const av of state.activeViolations) {
      if (av.persistent && av.persistent.tick === action.type) {
        effects.push(av.persistent.effect);
      }
    }
    return effects;
  }

  /** Check if any persistent violations are now resolved. */
  checkResolutions(state: GameState): string[] {
    const resolved: string[] = [];
    for (const av of state.activeViolations) {
      if (av.persistent && evaluateCondition(av.persistent.until, state)) {
        resolved.push(av.ruleId);
      }
    }
    return resolved;
  }

  /** Find discovered rule pairs that contradict each other. */
  findContradictions(state: GameState): ContradictionPair[] {
    const pairs: ContradictionPair[] = [];
    for (const rule of this.level.rules) {
      if (!state.knownRules.has(rule.id)) continue;
      if (!rule.contradicts) continue;
      for (const cid of rule.contradicts) {
        if (!state.knownRules.has(cid)) continue;
        // Avoid duplicate pairs (report each pair once)
        if (rule.id < cid) {
          pairs.push({ ruleA: rule.id, ruleB: cid });
        }
      }
    }
    return pairs;
  }

  /** Check if any ending condition is met. Returns the first matching ending. */
  checkEndings(state: GameState): EndingDef | null {
    for (const ending of this.level.endings) {
      if (allConditionsMet(ending.conditions, state)) {
        return ending;
      }
    }
    return null;
  }

  /** Get a node definition by ID. */
  getNode(nodeId: string) {
    return this.level.nodes.find(n => n.id === nodeId);
  }

  /** Get the level metadata. */
  getLevel(): Level {
    return this.level;
  }

  /** Get a rule by ID. */
  getRule(ruleId: string) {
    return this.level.rules.find(r => r.id === ruleId);
  }
}

// ---- Serialization helpers (used by store) ----
export function serializeState(state: GameState) {
  return {
    hp: state.hp,
    sanity: state.sanity,
    items: [...state.items],
    flags: [...state.flags],
    knownRules: [...state.knownRules.entries()],
    visitedNodes: [...state.visitedNodes],
    currentNodeId: state.currentNodeId,
    expandedNodes: [...state.expandedNodes],
    activeViolations: state.activeViolations,
    discoveredEndings: state.discoveredEndings,
  };
}

export function deserializeState(data: ReturnType<typeof serializeState>): Partial<GameState> {
  return {
    hp: data.hp,
    sanity: data.sanity,
    items: data.items,
    flags: new Set(data.flags),
    knownRules: new Map(data.knownRules),
    visitedNodes: new Set(data.visitedNodes),
    currentNodeId: data.currentNodeId,
    expandedNodes: new Set(data.expandedNodes),
    activeViolations: data.activeViolations,
    discoveredEndings: data.discoveredEndings,
  };
}
