import { clampNeed, defaultNeeds } from './needs.js';
import { STAGE_XP, stageForXp, stageProgressForXp } from './lifecycle.js';
import type { LifeStage, PetSnapshot } from './types.js';
import { clamp, clamp01 } from './types.js';
import type { MotionProfile } from './motion.js';

export const SCHEMA_VERSION = 3;

const STAGES: readonly LifeStage[] = ['baby', 'young', 'adult'];
const MOTION_VALUES: readonly MotionProfile[] = ['still', 'calm', 'full'];

export function defaultSnapshot(now: number): PetSnapshot {
  const needs = defaultNeeds();
  return {
    schemaVersion: SCHEMA_VERSION,
    bornAt: now,
    lastUpdatedAt: now,
    stage: 'baby',
    stageProgress: 0,
    xp: 0,
    energy: needs.energy,
    hunger: needs.hunger,
    affection: needs.affection,
    curiosity: needs.curiosity,
    trust: needs.trust,
    completedTours: [],
    unlockedActions: ['wave'],
    hidden: false,
    paused: false,
    muted: false,
    motionOverride: null,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string').slice(0, 64);
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asTimestamp(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  // Guard against clock corruption writing a timestamp far in the future.
  return numeric > fallback + 86_400_000 ? fallback : numeric;
}

/**
 * Upgrades historic shapes to the current one.
 *
 * v1: needs were nested (`{ needs: { energy, hunger, affection } }`), no trust/curiosity.
 * v2: flat needs, but `tours` / `mute` naming and no motion preference.
 * v3: current shape.
 */
export function migrateSnapshot(raw: unknown): Record<string, unknown> {
  const input = asRecord(raw);
  const version = typeof input.schemaVersion === 'number' ? input.schemaVersion : 1;
  let working: Record<string, unknown> = { ...input };

  if (version < 2) {
    const nested = asRecord(working.needs);
    const hadNestedNeeds = typeof working.needs === 'object' && working.needs !== null;
    working = {
      ...working,
      energy: nested.energy ?? working.energy,
      hunger: nested.hunger ?? working.hunger,
      affection: nested.affection ?? working.affection,
      // v1 had no curiosity/trust. Seed them only for records that really were v1 —
      // an empty or unrecognisable payload must fall through to the current defaults.
      curiosity: working.curiosity ?? (hadNestedNeeds ? nested.curiosity ?? 60 : undefined),
      trust: working.trust ?? (hadNestedNeeds ? nested.trust ?? 20 : undefined),
      tours: working.tours ?? working.completedTours,
    };
    delete working.needs;
  }

  if (version < 3) {
    working = {
      ...working,
      completedTours: working.completedTours ?? working.tours ?? [],
      muted: working.muted ?? working.mute ?? false,
      motionOverride: working.motionOverride ?? null,
      unlockedActions: working.unlockedActions ?? ['wave'],
    };
    delete working.tours;
    delete working.mute;
  }

  working.schemaVersion = SCHEMA_VERSION;
  return working;
}

/** Anything unrecognised falls back to a sane default rather than throwing. */
export function validateSnapshot(raw: unknown, now: number): PetSnapshot {
  const fallback = defaultSnapshot(now);
  const input = migrateSnapshot(raw);
  const xpRaw = typeof input.xp === 'number' ? input.xp : Number(input.xp);
  const storedStage = STAGES.includes(input.stage as LifeStage) ? (input.stage as LifeStage) : null;
  // Legacy records stored the stage without XP: keep the earned stage by lifting XP to its floor.
  const xpFloor = storedStage ? STAGE_XP[storedStage] : 0;
  const xp = clamp(Math.max(Number.isFinite(xpRaw) ? xpRaw : 0, xpFloor), 0, 1_000_000);
  const motion = MOTION_VALUES.includes(input.motionOverride as MotionProfile)
    ? (input.motionOverride as MotionProfile)
    : null;
  const bornAt = asTimestamp(input.bornAt, now);

  return {
    schemaVersion: SCHEMA_VERSION,
    bornAt,
    lastUpdatedAt: Math.max(bornAt, asTimestamp(input.lastUpdatedAt, now)),
    // XP is the single source of truth for the stage; a mismatched stored value is corrected.
    stage: stageForXp(xp),
    stageProgress:
      typeof input.stageProgress === 'number' ? clamp01(input.stageProgress) : stageProgressForXp(xp),
    xp,
    energy: clampNeed(input.energy, fallback.energy),
    hunger: clampNeed(input.hunger, fallback.hunger),
    affection: clampNeed(input.affection, fallback.affection),
    curiosity: clampNeed(input.curiosity, fallback.curiosity),
    trust: clampNeed(input.trust, fallback.trust),
    completedTours: asStringArray(input.completedTours),
    unlockedActions: asStringArray(input.unlockedActions),
    hidden: asBoolean(input.hidden, false),
    paused: asBoolean(input.paused, false),
    muted: asBoolean(input.muted, false),
    motionOverride: motion,
  };
}
