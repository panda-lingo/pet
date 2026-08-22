import { describe, expect, it } from 'vitest';
import { brandDuration, breakpointFor, edgeGapFor, hexToNumber, petSizeFor } from '../src/brand.js';
import {
  capabilitiesFor,
  damp,
  easeInOutSine,
  easeOutCubic,
  MOTION_CAPABILITIES,
  mulberry32,
  randomRange,
  resolveMotionProfile,
} from '../src/motion.js';

describe('motion profiles', () => {
  it('follows prefers-reduced-motion unless the user overrides it', () => {
    expect(resolveMotionProfile(false, null)).toBe('calm');
    expect(resolveMotionProfile(true, null)).toBe('still');
    expect(resolveMotionProfile(true, 'full')).toBe('full');
    expect(resolveMotionProfile(false, 'still')).toBe('still');
    expect(resolveMotionProfile(false, 'calm')).toBe('calm');
  });

  it('switches everything off for the still profile', () => {
    const still = capabilitiesFor('still');
    expect(still.amplitude).toBe(0);
    expect(still.travelMs).toBe(0);
    for (const flag of [still.breathing, still.blinking, still.idleActions, still.walk, still.jump, still.particles]) {
      expect(flag).toBe(false);
    }
  });

  it('keeps the calm brand profile finite and quiet', () => {
    const calm = capabilitiesFor('calm');
    expect(calm.breathing).toBe(true);
    expect(calm.blinking).toBe(true);
    expect(calm.amplitude).toBeGreaterThan(0);
    expect(calm.amplitude).toBeLessThan(1);
    // The brand forbids bouncing and particle effects on the floating pet.
    expect(calm.walk).toBe(false);
    expect(calm.jump).toBe(false);
    expect(calm.particles).toBe(false);
    expect(calm.travelMs).toBe(brandDuration.slow);
  });

  it('reserves walking, hops and particles for the full showcase profile', () => {
    const full = MOTION_CAPABILITIES.full;
    expect(full.walk).toBe(true);
    expect(full.jump).toBe(true);
    expect(full.particles).toBe(true);
    expect(full.amplitude).toBe(1);
  });
});

describe('motion helpers', () => {
  it('damps toward the target independently of frame rate', () => {
    expect(damp(0, 10, 5, 0)).toBe(0);
    expect(damp(0, 10, 5, -1)).toBe(0);
    const oneFrame = damp(0, 10, 5, 1 / 60);
    expect(oneFrame).toBeGreaterThan(0);
    expect(oneFrame).toBeLessThan(10);

    let coarse = 0;
    coarse = damp(coarse, 10, 5, 0.5);
    coarse = damp(coarse, 10, 5, 0.5);
    let fine = 0;
    for (let index = 0; index < 10; index += 1) fine = damp(fine, 10, 5, 0.1);
    expect(fine).toBeCloseTo(coarse, 1);
  });

  it('eases within 0–1 and clamps its input', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875, 5);
    expect(easeOutCubic(-2)).toBe(0);
    expect(easeOutCubic(4)).toBe(1);
    expect(easeInOutSine(0)).toBeCloseTo(0, 6);
    expect(easeInOutSine(0.5)).toBeCloseTo(0.5, 6);
    expect(easeInOutSine(1)).toBeCloseTo(1, 6);
  });

  it('produces a reproducible random sequence for tests and idle timing', () => {
    const first = mulberry32(1234);
    const second = mulberry32(1234);
    for (let index = 0; index < 50; index += 1) {
      const value = first();
      expect(value).toBe(second());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    const rng = mulberry32(7);
    for (let index = 0; index < 20; index += 1) {
      const value = randomRange(rng, 2, 5);
      expect(value).toBeGreaterThanOrEqual(2);
      expect(value).toBeLessThanOrEqual(5);
    }
  });
});

describe('brand tokens', () => {
  it('maps viewport width onto the documented pet footprints', () => {
    expect(breakpointFor(1440)).toBe('desktop');
    expect(breakpointFor(800)).toBe('tablet');
    expect(breakpointFor(390)).toBe('mobile');

    expect(petSizeFor(1440, false)).toBe(64);
    expect(petSizeFor(800, false)).toBe(56);
    expect(petSizeFor(390, false)).toBe(48);
    // Engaged sizes stay inside the 120–240px window the briefs ask for on desktop.
    expect(petSizeFor(1440, true)).toBe(148);
    expect(petSizeFor(390, true)).toBe(116);

    expect(edgeGapFor(1440)).toBe(24);
    expect(edgeGapFor(390)).toBe(16);
  });

  it('converts brand hex colours for PixiJS', () => {
    expect(hexToNumber('#F8F6F2')).toBe(0xf8f6f2);
    expect(hexToNumber('#000000')).toBe(0);
  });
});
