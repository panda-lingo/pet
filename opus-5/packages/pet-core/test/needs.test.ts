import { describe, expect, it } from 'vitest';
import {
  applyNeedEvent,
  clampNeed,
  clampNeeds,
  defaultNeeds,
  driftNeeds,
  isPositiveEvent,
  NEED_DRIFT_PER_HOUR,
} from '../src/needs.js';

const HOUR = 3_600_000;

describe('needs', () => {
  it('starts inside the documented 0–100 range', () => {
    const needs = defaultNeeds();
    for (const value of Object.values(needs)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it('clamps and repairs anything that claims to be a need', () => {
    expect(clampNeed(120, 50)).toBe(100);
    expect(clampNeed(-20, 50)).toBe(0);
    expect(clampNeed('42', 50)).toBe(42);
    expect(clampNeed(Number.NaN, 50)).toBe(50);
    expect(clampNeed(null, 50)).toBe(50);
    expect(clampNeed(undefined, 50)).toBe(50);
    expect(clampNeed({}, 50)).toBe(50);
  });

  it('clamps a whole record and falls back per field', () => {
    const repaired = clampNeeds({ energy: 999, hunger: -5, affection: 'oops', curiosity: 70 });
    expect(repaired.energy).toBe(100);
    expect(repaired.hunger).toBe(0);
    expect(repaired.affection).toBe(defaultNeeds().affection);
    expect(repaired.curiosity).toBe(70);
    expect(repaired.trust).toBe(defaultNeeds().trust);
  });

  it('drifts awake needs in the documented direction over one hour', () => {
    const before = defaultNeeds();
    const after = driftNeeds(before, HOUR);
    expect(after.energy).toBeCloseTo(before.energy + NEED_DRIFT_PER_HOUR.awake.energy, 5);
    // `hunger` is hungriness, so it rises while the pet is awake.
    expect(after.hunger).toBeCloseTo(before.hunger + NEED_DRIFT_PER_HOUR.awake.hunger, 5);
    expect(after.affection).toBeLessThan(before.affection);
    expect(after.curiosity).toBeGreaterThan(before.curiosity);
    expect(after.trust).toBe(before.trust);
  });

  it('recovers energy while sleeping and clamps at the ceiling', () => {
    const tired = { ...defaultNeeds(), energy: 10 };
    const rested = driftNeeds(tired, 2 * HOUR, { sleeping: true });
    expect(rested.energy).toBeCloseTo(10 + NEED_DRIFT_PER_HOUR.sleeping.energy * 2, 5);
    expect(driftNeeds({ ...defaultNeeds(), energy: 95 }, 10 * HOUR, { sleeping: true }).energy).toBe(100);
  });

  it('ignores non-positive elapsed time and scales by rate', () => {
    const before = defaultNeeds();
    expect(driftNeeds(before, 0)).toEqual(before);
    expect(driftNeeds(before, -HOUR)).toEqual(before);
    expect(driftNeeds(before, HOUR, { rate: 0.5 }).energy).toBeCloseTo(before.energy - 2.5, 5);
  });

  it('applies event deltas with clamping', () => {
    const hungry = { ...defaultNeeds(), hunger: 30 };
    const fed = applyNeedEvent(hungry, { kind: 'FED', at: 0 });
    expect(fed.hunger).toBe(0);
    expect(fed.energy).toBe(88);
    expect(fed.affection).toBe(62);
  });

  it('scales an event by its gesture weight (diminishing returns)', () => {
    const base = defaultNeeds();
    const full = applyNeedEvent(base, { kind: 'PETTED', at: 0, weight: 1 });
    const half = applyNeedEvent(base, { kind: 'PETTED', at: 0, weight: 0.5 });
    expect(full.affection - base.affection).toBeCloseTo(14, 5);
    expect(half.affection - base.affection).toBeCloseTo(7, 5);
    // Weights outside 0–1 cannot amplify a reward.
    expect(applyNeedEvent(base, { kind: 'PETTED', at: 0, weight: 9 })).toEqual(full);
  });

  it('treats only IGNORED as a negative interaction', () => {
    expect(isPositiveEvent('PETTED')).toBe(true);
    expect(isPositiveEvent('TOUR_COMPLETED')).toBe(true);
    expect(isPositiveEvent('IGNORED')).toBe(false);
    const ignored = applyNeedEvent(defaultNeeds(), { kind: 'IGNORED', at: 0 });
    expect(ignored.affection).toBeLessThan(defaultNeeds().affection);
  });
});
