import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/motion.js';
import { PoseEngine } from '../src/pose/engine.js';
import { REACTIONS } from '../src/pose/reactions.js';
import { createPetRuntime, type PetRuntime, type PetRuntimeState } from '../src/runtime.js';
import type { PoseSnapshot } from '../src/pose/types.js';

function setup(overrides: Partial<PetRuntimeState> = {}): { runtime: PetRuntime; engine: PoseEngine } {
  const runtime = createPetRuntime(overrides);
  return { runtime, engine: new PoseEngine(runtime, { rng: mulberry32(0x1234) }) };
}

const run = (engine: PoseEngine, frames: number, dt = 16): PoseSnapshot => {
  let pose = engine.update(dt);
  for (let index = 1; index < frames; index += 1) pose = engine.update(dt);
  return pose;
};

describe('pose engine', () => {
  it('reuses one snapshot object instead of allocating per frame', () => {
    const { engine } = setup();
    expect(engine.update(16)).toBe(engine.update(16));
  });

  it('renders a single static frame under reduced motion', () => {
    const { runtime, engine } = setup({ motion: 'still', gaze: { x: 1, y: -1 } });
    const first = { ...engine.update(16) };
    const second = { ...run(engine, 30) };
    expect(second).toEqual(first);
    expect(first.rootX).toBe(0);
    expect(first.bodyScaleY).toBe(1);
    expect(first.pupilX).toBe(0);
    expect(first.sparkle).toBe(0);
    expect(first.eyeOpen).toBeGreaterThanOrEqual(0.7);

    // Even a queued reaction cannot animate the still frame.
    runtime.trigger('bounce');
    expect({ ...engine.update(16) }).toEqual(first);
  });

  it('breathes gently in the calm profile without leaving its bounds', () => {
    const { engine } = setup({ motion: 'calm' });
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (let index = 0; index < 240; index += 1) {
      const pose = engine.update(16);
      min = Math.min(min, pose.bodyScaleY);
      max = Math.max(max, pose.bodyScaleY);
      expect(Number.isFinite(pose.rootX)).toBe(true);
      expect(Math.abs(pose.rootX)).toBeLessThanOrEqual(1);
    }
    expect(max).toBeGreaterThan(min);
    expect(max - min).toBeLessThan(0.1);
  });

  it('shows mood on the face rather than through cartoon expressions', () => {
    const tired = setup({ mood: 'tired' });
    const tiredPose = { ...tired.engine.update(16) };
    expect(tiredPose.earLeftRot).toBeGreaterThan(0);
    expect(tiredPose.eyeOpen).toBeLessThan(0.75);
    expect(tiredPose.bodyY).toBeGreaterThan(0);

    const happy = setup({ mood: 'happy' });
    const happyPose = { ...happy.engine.update(16) };
    expect(happyPose.mouthCurve).toBeGreaterThan(tiredPose.mouthCurve);
    expect(happyPose.mouthCurve).toBeLessThanOrEqual(1);
  });

  it('layers a one-shot reaction and then removes it', () => {
    const { runtime, engine } = setup({ motion: 'calm' });
    runtime.trigger('nod');
    let peak = 0;
    for (let elapsed = 0; elapsed < REACTIONS.nod.durationMs; elapsed += 16) {
      peak = Math.max(peak, engine.update(16).headY);
    }
    expect(peak).toBeGreaterThan(1);
    expect(Math.abs(engine.update(16).headY)).toBeLessThan(0.2);
  });

  it('closes the eyes fully when it blinks, whatever the amplitude', () => {
    const { runtime, engine } = setup({ motion: 'calm' });
    runtime.trigger('blink');
    let lowest = 1;
    for (let elapsed = 0; elapsed < REACTIONS.blink.durationMs; elapsed += 16) {
      lowest = Math.min(lowest, engine.update(16).eyeOpen);
    }
    expect(lowest).toBeLessThan(0.1);
  });

  it('keeps particles out of the calm profile and allows them in full', () => {
    const calm = setup({ motion: 'calm', pose: 'celebrate' });
    calm.runtime.trigger('sparkle');
    calm.runtime.trigger('heart');
    for (let index = 0; index < 40; index += 1) {
      const pose = calm.engine.update(16);
      expect(pose.sparkle).toBe(0);
      expect(pose.heart).toBe(0);
    }

    const full = setup({ motion: 'full', pose: 'celebrate' });
    full.runtime.trigger('sparkle');
    let brightest = 0;
    for (let index = 0; index < 40; index += 1) brightest = Math.max(brightest, full.engine.update(16).sparkle);
    expect(brightest).toBeGreaterThan(0);
  });

  it('holds a standing pose when the profile forbids walking', () => {
    const calm = setup({ motion: 'calm', pose: 'walk' });
    for (let index = 0; index < 60; index += 1) {
      expect(calm.engine.update(16).legFrontRot).toBe(0);
    }

    const full = setup({ motion: 'full', pose: 'walk' });
    let moved = false;
    for (let index = 0; index < 60; index += 1) {
      if (Math.abs(full.engine.update(16).legFrontRot) > 1) moved = true;
    }
    expect(moved).toBe(true);
  });

  it('tracks the gaze target and only in profiles that allow it', () => {
    const calm = setup({ motion: 'calm', gaze: { x: 1, y: 0 } });
    const tracked = run(calm.engine, 90);
    expect(tracked.pupilX).toBeGreaterThan(0.5);
    expect(tracked.pupilX).toBeLessThanOrEqual(1.2);

    const still = setup({ motion: 'still', gaze: { x: 1, y: 0 } });
    expect(run(still.engine, 90).pupilX).toBe(0);
  });

  it('survives a long frame gap without teleporting', () => {
    const { engine } = setup({ motion: 'calm' });
    run(engine, 30);
    const jumped = engine.update(5_000);
    expect(Number.isFinite(jumped.rootY)).toBe(true);
    expect(jumped.bodyScaleY).toBeLessThanOrEqual(1.4);
    expect(jumped.bodyScaleY).toBeGreaterThanOrEqual(0.6);
    expect(jumped.eyeOpen).toBeGreaterThanOrEqual(0);
    expect(jumped.eyeOpen).toBeLessThanOrEqual(1);
  });

  it('sleeps with closed eyes and a settled body', () => {
    const { engine } = setup({ motion: 'calm', pose: 'sleep', mood: 'tired' });
    const pose = run(engine, 30);
    expect(pose.eyeOpen).toBeLessThan(0.1);
    expect(pose.bodyY).toBeGreaterThan(2);
    expect(pose.shadowScale).toBeGreaterThan(1);
  });

  it('opens the mouth while speaking and squints while being petted', () => {
    const speaking = setup({ motion: 'calm', speaking: true });
    let opened = 0;
    for (let index = 0; index < 60; index += 1) opened = Math.max(opened, speaking.engine.update(16).mouthOpen);
    expect(opened).toBeGreaterThan(0.15);

    const petted = setup({ motion: 'calm', petting: 1 });
    const pose = petted.engine.update(16);
    expect(pose.eyeOpen).toBeLessThan(0.5);
    expect(pose.blush).toBeGreaterThan(0.3);
  });
});
