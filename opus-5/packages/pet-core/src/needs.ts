import type { Needs, PetEvent, PetEventKind } from './types.js';
import { clamp } from './types.js';

/**
 * Need drift, expressed per hour so the same table can drive both the live ticker
 * and the capped offline catch-up. Idle drift is deliberately gentle: the brand pet
 * should never nag.
 */
export const NEED_DRIFT_PER_HOUR = {
  awake: { energy: -5, hunger: 4.5, affection: -7, curiosity: 3, trust: 0 },
  sleeping: { energy: 16, hunger: 1.5, affection: -2, curiosity: 1, trust: 0 },
} as const;

const EVENT_DELTAS: Record<PetEventKind, Partial<Needs>> = {
  CLICKED: { affection: 3, curiosity: 3, trust: 0.5 },
  PETTED: { affection: 14, trust: 4, energy: -1 },
  FED: { hunger: -38, affection: 4, energy: 6 },
  PLAYED: { affection: 8, curiosity: -12, energy: -8, trust: 2 },
  TOUR_STEP_COMPLETED: { trust: 5, curiosity: -6, affection: 2 },
  TOUR_COMPLETED: { trust: 12, affection: 6, curiosity: -10 },
  USER_RETURNED: { affection: 6, curiosity: 8, trust: 1 },
  IGNORED: { affection: -6, curiosity: 4 },
};

export const NEED_KEYS = ['energy', 'hunger', 'affection', 'curiosity', 'trust'] as const;

export function defaultNeeds(): Needs {
  return { energy: 82, hunger: 26, affection: 58, curiosity: 64, trust: 30 };
}

export function clampNeed(value: unknown, fallback: number): number {
  // Only numbers and numeric strings are accepted; `null`, booleans and objects would
  // otherwise coerce to 0 and silently wipe a stored need.
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(numeric)) return fallback;
  return clamp(numeric, 0, 100);
}

/** Validates and clamps anything that claims to be a `Needs` record. */
export function clampNeeds(input: unknown, fallback: Needs = defaultNeeds()): Needs {
  const source = (input ?? {}) as Partial<Record<keyof Needs, unknown>>;
  return {
    energy: clampNeed(source.energy, fallback.energy),
    hunger: clampNeed(source.hunger, fallback.hunger),
    affection: clampNeed(source.affection, fallback.affection),
    curiosity: clampNeed(source.curiosity, fallback.curiosity),
    trust: clampNeed(source.trust, fallback.trust),
  };
}

export interface DriftOptions {
  sleeping?: boolean;
  /** Scales drift; used to slow the clock for the calm brand profile. */
  rate?: number;
}

export function driftNeeds(needs: Needs, elapsedMs: number, options: DriftOptions = {}): Needs {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return { ...needs };
  const table = options.sleeping ? NEED_DRIFT_PER_HOUR.sleeping : NEED_DRIFT_PER_HOUR.awake;
  const hours = (elapsedMs / 3_600_000) * (options.rate ?? 1);
  return clampNeeds({
    energy: needs.energy + table.energy * hours,
    hunger: needs.hunger + table.hunger * hours,
    affection: needs.affection + table.affection * hours,
    curiosity: needs.curiosity + table.curiosity * hours,
    trust: needs.trust + table.trust * hours,
  });
}

/**
 * Applies one interaction. `event.weight` (0–1) carries diminishing returns from the
 * gesture layer so that stroking the panda for a minute does not max out affection.
 */
export function applyNeedEvent(needs: Needs, event: PetEvent): Needs {
  const deltas = EVENT_DELTAS[event.kind];
  const weight = clamp(event.weight ?? 1, 0, 1);
  const next = { ...needs };
  for (const key of NEED_KEYS) {
    const delta = deltas[key];
    if (typeof delta === 'number') next[key] = clamp(next[key] + delta * weight, 0, 100);
  }
  return next;
}

/** Positive interactions used for mood scoring and XP. */
export function isPositiveEvent(kind: PetEventKind): boolean {
  return kind !== 'IGNORED';
}
