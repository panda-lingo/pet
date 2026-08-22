import { describe, expect, it } from 'vitest';
import {
  addXp,
  blendStageParams,
  STAGE_PARAMS,
  STAGE_XP,
  stageForXp,
  stageParamsFor,
  stageProgressForXp,
  XP_PER_EVENT,
} from '../src/lifecycle.js';

describe('life stages', () => {
  it('derives the stage from XP thresholds', () => {
    expect(stageForXp(0)).toBe('baby');
    expect(stageForXp(STAGE_XP.young - 1)).toBe('baby');
    expect(stageForXp(STAGE_XP.young)).toBe('young');
    expect(stageForXp(STAGE_XP.adult - 1)).toBe('young');
    expect(stageForXp(STAGE_XP.adult)).toBe('adult');
    expect(stageForXp(99_999)).toBe('adult');
  });

  it('repairs nonsense XP instead of throwing', () => {
    expect(stageForXp(Number.NaN)).toBe('baby');
    expect(stageForXp(-500)).toBe('baby');
    expect(addXp(Number.NaN, Number.NaN).xp).toBe(0);
    expect(addXp(10, -100).xp).toBe(0);
  });

  it('reports progress through the current stage', () => {
    expect(stageProgressForXp(0)).toBe(0);
    expect(stageProgressForXp(STAGE_XP.young / 2)).toBeCloseTo(0.5, 5);
    expect(stageProgressForXp(STAGE_XP.young)).toBe(0);
    expect(stageProgressForXp((STAGE_XP.young + STAGE_XP.adult) / 2)).toBeCloseTo(0.5, 5);
    expect(stageProgressForXp(STAGE_XP.adult)).toBe(1);
    expect(stageProgressForXp(10_000)).toBe(1);
  });

  it('flags the frame in which a stage changes', () => {
    const stillBaby = addXp(STAGE_XP.young - 20, XP_PER_EVENT.CLICKED);
    expect(stillBaby.stage).toBe('baby');
    expect(stillBaby.stageChanged).toBe(false);

    const grown = addXp(STAGE_XP.young - 2, XP_PER_EVENT.TOUR_STEP_COMPLETED);
    expect(grown.stage).toBe('young');
    expect(grown.stageChanged).toBe(true);

    const again = addXp(grown.xp, XP_PER_EVENT.CLICKED);
    expect(again.stageChanged).toBe(false);
  });

  it('rewards guided tours more than taps', () => {
    expect(XP_PER_EVENT.TOUR_COMPLETED).toBeGreaterThan(XP_PER_EVENT.TOUR_STEP_COMPLETED);
    expect(XP_PER_EVENT.TOUR_STEP_COMPLETED).toBeGreaterThan(XP_PER_EVENT.CLICKED);
    expect(XP_PER_EVENT.IGNORED).toBe(0);
  });

  it('gives each stage a distinct but brand-restrained silhouette', () => {
    const { baby, young, adult } = STAGE_PARAMS;
    expect(baby.headScale).toBeGreaterThan(young.headScale);
    expect(young.headScale).toBeGreaterThan(adult.headScale);
    expect(baby.legLength).toBeLessThan(adult.legLength);
    expect(baby.overallScale).toBeLessThan(adult.overallScale);
    expect(baby.movementSpeed).toBeGreaterThan(adult.movementSpeed);
    expect(baby.showMarkings).toBe(false);
    expect(adult.showMarkings).toBe(true);
    // The brand forbids "huge eyes": the baby delta stays under 10%.
    expect(baby.eyeScale).toBeLessThanOrEqual(1.1);
    expect(stageParamsFor('adult')).toBe(adult);
  });

  it('interpolates proportions during a stage transition', () => {
    const mid = blendStageParams(STAGE_PARAMS.baby, STAGE_PARAMS.adult, 0.5);
    expect(mid.headScale).toBeCloseTo((STAGE_PARAMS.baby.headScale + 1) / 2, 5);
    expect(mid.showMarkings).toBe(true);
    expect(blendStageParams(STAGE_PARAMS.baby, STAGE_PARAMS.adult, 0.2).showMarkings).toBe(false);
    expect(blendStageParams(STAGE_PARAMS.baby, STAGE_PARAMS.adult, -3)).toEqual(STAGE_PARAMS.baby);
    expect(blendStageParams(STAGE_PARAMS.baby, STAGE_PARAMS.adult, 9)).toEqual(STAGE_PARAMS.adult);
  });
});
