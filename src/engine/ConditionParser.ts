// engine/ConditionParser.ts — Condition expression evaluator.
// Two-pass: Tokenize (string → tokens) → Evaluate (tokens + state → boolean)
// Pure functions. Zero dependencies except types.

import type { Condition, GameState } from './types';

// ---- State Resolver ----
// Pure lookups on GameState. Each built-in function maps here.
export class StateResolver {
  private state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }

  has_item(id: string): boolean {
    return this.state.items.includes(id);
  }

  has_flag(name: string): boolean {
    return this.state.flags.has(name);
  }

  knows_rule(id: string): boolean {
    return this.state.knownRules.has(id);
  }

  visited(nodeId: string): boolean {
    return this.state.visitedNodes.has(nodeId);
  }

  getStat(name: string): number {
    if (name === 'sanity') return this.state.sanity;
    if (name === 'hp') return this.state.hp;
    throw new Error(`Unknown stat: ${name}`);
  }
}

// ---- Token Types ----
type Token =
  | { type: 'func'; name: string; args: string[] }
  | { type: 'compare'; variable: string; op: string; value: number }
  | { type: 'not' }
  | { type: 'and' }
  | { type: 'or' }
  | { type: 'lparen' }
  | { type: 'rparen' };

// ---- Pass 1: Tokenize ----
function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    // Skip whitespace
    if (/\s/.test(expr[i])) { i++; continue; }

    // Negation
    if (expr[i] === '!') {
      tokens.push({ type: 'not' });
      i++;
      continue;
    }

    // Parentheses
    if (expr[i] === '(') { tokens.push({ type: 'lparen' }); i++; continue; }
    if (expr[i] === ')') { tokens.push({ type: 'rparen' }); i++; continue; }

    // AND / OR keywords
    if (expr.slice(i, i + 3).toUpperCase() === 'AND') {
      tokens.push({ type: 'and' });
      i += 3;
      continue;
    }
    if (expr.slice(i, i + 2).toUpperCase() === 'OR') {
      tokens.push({ type: 'or' });
      i += 2;
      continue;
    }

    // Function call: name '(' arg ')'
    const funcMatch = expr.slice(i).match(/^([a-zA-Z_]\w*)\s*\(/);
    if (funcMatch) {
      const name = funcMatch[1];
      i += funcMatch[0].length;
      const args: string[] = [];
      // Parse comma-separated string arguments
      while (i < expr.length && expr[i] !== ')') {
        if (expr[i] === "'" || expr[i] === '"') {
          const quote = expr[i];
          i++;
          let arg = '';
          while (i < expr.length && expr[i] !== quote) {
            arg += expr[i];
            i++;
          }
          i++; // skip closing quote
          args.push(arg);
        } else {
          i++;
        }
      }
      if (i < expr.length) i++; // skip ')'
      tokens.push({ type: 'func', name, args });
      continue;
    }

    // Comparison: variable op number
    const cmpMatch = expr.slice(i).match(/^([a-zA-Z_]\w*)\s*(>=|<=|>|<|==|!=)\s*(-?\d+(?:\.\d+)?)/);
    if (cmpMatch) {
      tokens.push({
        type: 'compare',
        variable: cmpMatch[1],
        op: cmpMatch[2],
        value: parseFloat(cmpMatch[3]),
      });
      i += cmpMatch[0].length;
      continue;
    }

    // Unknown token — skip
    i++;
  }

  return tokens;
}

// ---- Pass 2: Evaluate ----
// Recursive descent over token stream
class Evaluator {
  private pos = 0;
  private tokens: Token[];
  private resolver: StateResolver;

  constructor(tokens: Token[], resolver: StateResolver) {
    this.tokens = tokens;
    this.resolver = resolver;
  }

  evaluate(): boolean {
    const result = this.expr();
    if (this.pos < this.tokens.length) {
      // Trailing tokens — treat as AND with remaining
      // This handles: "has_item('key') sanity >= 50" (implicit AND)
      if (this.tokens[this.pos].type === 'func' || this.tokens[this.pos].type === 'compare' || this.tokens[this.pos].type === 'not') {
        const rest = this.expr();
        return result && rest;
      }
    }
    return result;
  }

  private expr(): boolean {
    return this.andExpr();
  }

  private andExpr(): boolean {
    let left = this.unary();

    while (this.pos < this.tokens.length) {
      const tok = this.tokens[this.pos];
      if (tok.type === 'and') {
        this.pos++;
        const right = this.unary();
        left = left && right;
      } else if (tok.type === 'func' || tok.type === 'compare' || tok.type === 'not' || tok.type === 'lparen') {
        // Implicit AND
        const right = this.unary();
        left = left && right;
      } else {
        break;
      }
    }

    return left;
  }

  private unary(): boolean {
    if (this.pos < this.tokens.length && this.tokens[this.pos].type === 'not') {
      this.pos++;
      return !this.atom();
    }
    return this.atom();
  }

  private atom(): boolean {
    if (this.pos >= this.tokens.length) return false;

    const tok = this.tokens[this.pos];

    if (tok.type === 'lparen') {
      this.pos++;
      const result = this.expr();
      // expect rparen
      if (this.pos < this.tokens.length && this.tokens[this.pos].type === 'rparen') {
        this.pos++;
      }
      return result;
    }

    if (tok.type === 'func') {
      this.pos++;
      return this.callFunc(tok.name, tok.args);
    }

    if (tok.type === 'compare') {
      this.pos++;
      const actual = this.resolver.getStat(tok.variable);
      switch (tok.op) {
        case '>=': return actual >= tok.value;
        case '<=': return actual <= tok.value;
        case '>':  return actual > tok.value;
        case '<':  return actual < tok.value;
        case '==': return actual === tok.value;
        case '!=': return actual !== tok.value;
        default:   return false;
      }
    }

    // Unknown — skip
    this.pos++;
    return false;
  }

  private callFunc(name: string, args: string[]): boolean {
    switch (name) {
      case 'has_item':   return this.resolver.has_item(args[0] ?? '');
      case 'has_flag':   return this.resolver.has_flag(args[0] ?? '');
      case 'knows_rule': return this.resolver.knows_rule(args[0] ?? '');
      case 'visited':    return this.resolver.visited(args[0] ?? '');
      default:
        console.warn(`Unknown function: ${name}`);
        return false;
    }
  }
}

// ---- Public API ----

/**
 * Evaluate a condition object against game state.
 * Conditions in an array = implicit AND.
 * { and: [...] } = explicit AND.
 * { or: [...] } = explicit OR.
 */
export function evaluateCondition(condition: Condition, state: GameState): boolean {
  if (typeof condition === 'string') {
    return evalString(condition, state);
  }
  if ('and' in condition) {
    return condition.and.every(c => evaluateCondition(c, state));
  }
  if ('or' in condition) {
    return condition.or.some(c => evaluateCondition(c, state));
  }
  return false;
}

/**
 * Evaluate a single condition string.
 */
export function evalString(expr: string, state: GameState): boolean {
  const resolver = new StateResolver(state);
  const tokens = tokenize(expr);
  const evaluator = new Evaluator(tokens, resolver);
  return evaluator.evaluate();
}

/**
 * Check if all conditions in an array are met (implicit AND).
 */
export function allConditionsMet(conditions: Condition[] | undefined, state: GameState): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every(c => evaluateCondition(c, state));
}
