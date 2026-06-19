// data/schema.ts — Zod validators + level loader + cycle detection
import { z } from 'zod/v4';
import type { Level, NodeDef } from '../engine/types';

// ---- Sub-schemas ----
const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const conditionSchema: z.ZodType = z.union([
  z.string(),
  z.object({ and: z.array(z.lazy(() => conditionSchema)) }),
  z.object({ or: z.array(z.lazy(() => conditionSchema)) }),
]);

const costSchema = z.object({
  hp: z.number().optional(),
  sanity: z.number().optional(),
});

const connectionSchema = z.object({
  targetId: z.string().min(1),
  label: z.string().min(1),
  conditions: z.array(conditionSchema).optional(),
  cost: costSchema.optional(),
});

const effectSchema = z.object({
  hp: z.number().optional(),
  sanity: z.number().optional(),
  addItems: z.array(z.string()).optional(),
  removeItems: z.array(z.string()).optional(),
  setFlag: z.string().optional(),
  narrative: z.string().optional(),
});

const onEnterSchema = z.object({
  addItems: z.array(z.string()).optional(),
  setFlag: z.string().optional(),
  grantsRule: z.string().optional(),
  narrative: z.string().optional(),
  effects: z.array(effectSchema).optional(),
  background: z.string().optional(),
}).optional();

const ruleTriggerSchema = z.object({
  on: z.enum(['node_enter', 'node_exit', 'item_use', 'always']),
  nodeId: z.string().optional(),
  itemId: z.string().optional(),
});

const ruleSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().min(1),
  text: z.string().min(1),
  annotation: z.string().optional(),
  triggers: z.array(ruleTriggerSchema),
  violation: z.object({
    condition: z.string().min(1),
    immediate: effectSchema,
    persistent: z.object({
      tick: z.string().min(1),
      effect: effectSchema,
      until: z.string().min(1),
    }).optional(),
    narrative: z.string().min(1),
  }),
  contradicts: z.array(z.string()).optional(),
});

const nodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['start', 'choice', 'clue', 'action', 'monster', 'ending']),
  content: z.string().min(1),
  position: positionSchema.optional(),
  children: z.array(connectionSchema),
  onEnter: onEnterSchema,
});

const itemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  usableOn: z.array(z.string()),
  combine: z.object({
    with: z.string(),
    becomes: z.string(),
  }).optional(),
});

const endingSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['true', 'bad', 'death', 'neutral']),
  conditions: z.array(conditionSchema),
  narrative: z.string().min(1),
});

export const levelSchema = z.object({
  meta: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    author: z.string(),
    version: z.number().int().min(1),
    description: z.string(),
  }),
  startNodeId: z.string().min(1),
  nodes: z.array(nodeSchema).min(1),
  rules: z.array(ruleSchema),
  items: z.array(itemSchema),
  endings: z.array(endingSchema).min(1),
});

// ---- Cycle Detection ----
// DFS-based back-edge detection. Rejects levels with cycles.
function detectCycles(nodes: NodeDef[]): string | null {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const n of nodes) color.set(n.id, WHITE);

  function dfs(nodeId: string, path: string[]): string | null {
    const c = color.get(nodeId);
    if (c === GRAY) {
      // Found a back edge — cycle detected
      const cycleStart = path.indexOf(nodeId);
      const cyclePath = path.slice(cycleStart).concat(nodeId).join(' → ');
      return `Cycle detected: ${cyclePath}`;
    }
    if (c === BLACK) return null;

    color.set(nodeId, GRAY);
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      for (const child of node.children) {
        const err = dfs(child.targetId, [...path, nodeId]);
        if (err) return err;
      }
    }
    color.set(nodeId, BLACK);
    return null;
  }

  for (const node of nodes) {
    const err = dfs(node.id, []);
    if (err) return err;
  }
  return null;
}

// ---- Level Loader ----
export function loadLevel(json: unknown): { ok: true; level: Level } | { ok: false; error: string } {
  const result = levelSchema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    return { ok: false, error: `Schema validation failed: ${issues}` };
  }

  // Cast needed: Zod's recursive type inference produces `unknown` for conditions
  // Runtime validation guarantees the shape matches Level
  const level = result.data as unknown as Level;

  // Validate startNodeId exists
  if (!level.nodes.find(n => n.id === level.startNodeId)) {
    return { ok: false, error: `startNodeId "${level.startNodeId}" not found in nodes` };
  }

  // Validate all connection targets exist
  for (const node of level.nodes) {
    for (const child of node.children) {
      if (!level.nodes.find(n => n.id === child.targetId)) {
        return { ok: false, error: `Node "${node.id}" references non-existent target "${child.targetId}"` };
      }
    }
  }

  // Validate rule contradicts references
  const ruleIds = new Set(level.rules.map(r => r.id));
  for (const rule of level.rules) {
    if (rule.contradicts) {
      for (const cid of rule.contradicts) {
        if (!ruleIds.has(cid)) {
          return { ok: false, error: `Rule "${rule.id}" contradicts non-existent rule "${cid}"` };
        }
      }
    }
  }

  // Cycle detection
  const cycleErr = detectCycles(level.nodes);
  if (cycleErr) {
    return { ok: false, error: cycleErr };
  }

  return { ok: true, level };
}
