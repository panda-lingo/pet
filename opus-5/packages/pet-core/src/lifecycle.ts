import type { LifeStage, PetEventKind, StageParams } from './types.js';
import { clamp } from './types.js';

export const STAGE_ORDER: readonly LifeStage[] = ['baby', 'young', 'adult'] as const;

/** XP at which each stage begins. */
export const STAGE_XP: Record<LifeStage, number> = { baby: 0, young: 150, adult: 500 };

/** XP awarded per interaction. Tours are worth more than taps so guiding stays the point. */
export const XP_PER_EVENT: Record<PetEventKind, number> = {
  CLICKED: 2,
  PETTED: 6,
  FED: 5,
  PLAYED: 8,
  TOUR_STEP_COMPLETED: 12,
  TOUR_COMPLETED: 40,
  USER_RETURNED: 3,
  IGNORED: 0,
};

/**
 * Life-stage proportions.
 *
 * The briefs ask for a big-headed, big-eyed baby; the brand forbids "huge eyes" and
 * anything childish. The deltas below are therefore restrained — the silhouettes are
 * clearly different at 148px, but the baby still reads as an elegant panda.
 */
export const STAGE_PARAMS: Record<LifeStage, StageParams> = {
  baby: {
    headScale: 1.14,
    bodyScale: 0.88,
    eyeScale: 1.08,
    earScale: 1.12,
    legLength: 0.78,
    tailLength: 0.82,
    overallScale: 0.92,
    movementSpeed: 1.18,
    showMarkings: false,
  },
  young: {
    headScale: 1.07,
    bodyScale: 0.95,
    eyeScale: 1.03,
    earScale: 1.06,
    legLength: 0.9,
    tailLength: 0.92,
    overallScale: 0.97,
    movementSpeed: 1.06,
    showMarkings: true,
  },
  adult: {
    headScale: 1,
    bodyScale: 1,
    eyeScale: 1,
    earScale: 1,
    legLength: 1,
    tailLength: 1,
    overallScale: 1,
    movementSpeed: 0.94,
    showMarkings: true,
  },
};

export function stageForXp(xp: number): LifeStage {
  const value = Math.max(0, Number.isFinite(xp) ? xp : 0);
  if (value >= STAGE_XP.adult) return 'adult';
  if (value >= STAGE_XP.young) return 'young';
  return 'baby';
}

/** 0–1 progress through the current stage; `adult` is terminal and reports 1. */
export function stageProgressForXp(xp: number): number {
  const value = Math.max(0, Number.isFinite(xp) ? xp : 0);
  const stage = stageForXp(value);
  if (stage === 'adult') return 1;
  const start = STAGE_XP[stage];
  const end = stage === 'baby' ? STAGE_XP.young : STAGE_XP.adult;
  return clamp((value - start) / (end - start), 0, 1);
}

export interface LifecycleResult {
  xp: number;
  stage: LifeStage;
  stageProgress: number;
  stageChanged: boolean;
}

export function addXp(currentXp: number, amount: number): LifecycleResult {
  const before = stageForXp(currentXp);
  const xp = Math.max(0, (Number.isFinite(currentXp) ? currentXp : 0) + (Number.isFinite(amount) ? amount : 0));
  const stage = stageForXp(xp);
  return { xp, stage, stageProgress: stageProgressForXp(xp), stageChanged: stage !== before };
}

export function stageParamsFor(stage: LifeStage): StageParams {
  return STAGE_PARAMS[stage];
}

/** Interpolates proportions during the short stage-change transition. */
export function blendStageParams(from: StageParams, to: StageParams, t: number): StageParams {
  const k = clamp(t, 0, 1);
  const mix = (a: number, b: number) => a + (b - a) * k;
  return {
    headScale: mix(from.headScale, to.headScale),
    bodyScale: mix(from.bodyScale, to.bodyScale),
    eyeScale: mix(from.eyeScale, to.eyeScale),
    earScale: mix(from.earScale, to.earScale),
    legLength: mix(from.legLength, to.legLength),
    tailLength: mix(from.tailLength, to.tailLength),
    overallScale: mix(from.overallScale, to.overallScale),
    movementSpeed: mix(from.movementSpeed, to.movementSpeed),
    showMarkings: k >= 0.5 ? to.showMarkings : from.showMarkings,
  };
}
