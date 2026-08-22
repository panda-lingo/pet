import { describe, expect, it } from 'vitest';
import { createGestureTracker, DEFAULT_GESTURE_CONFIG } from '../src/gestures.js';

describe('gesture classification', () => {
  it('reads a short, still press as a tap', () => {
    const tracker = createGestureTracker();
    tracker.down({ x: 0, y: 0, at: 0 });
    expect(tracker.isActive()).toBe(true);
    expect(tracker.up({ x: 3, y: 3, at: 200 })).toEqual({ kind: 'tap' });
    expect(tracker.isActive()).toBe(false);
  });

  it('ignores a long press and a drag that never reaches the petting threshold', () => {
    const tracker = createGestureTracker();
    tracker.down({ x: 0, y: 0, at: 0 });
    expect(tracker.up({ x: 0, y: 0, at: 900 })).toEqual({ kind: 'none' });

    tracker.down({ x: 0, y: 0, at: 1_000 });
    expect(tracker.move({ x: 20, y: 0, at: 1_100 })).toEqual({ kind: 'none' });
    expect(tracker.up({ x: 20, y: 0, at: 1_200 })).toEqual({ kind: 'none' });
  });

  it('pays out petting once the stroke is long enough, then every repeat distance', () => {
    const tracker = createGestureTracker();
    tracker.down({ x: 0, y: 0, at: 0 });
    expect(tracker.move({ x: DEFAULT_GESTURE_CONFIG.petMinDistance - 1, y: 0, at: 60 })).toEqual({ kind: 'none' });

    const first = tracker.move({ x: DEFAULT_GESTURE_CONFIG.petMinDistance, y: 0, at: 100 });
    expect(first).toEqual({ kind: 'pet', weight: 1 });

    expect(tracker.move({ x: 150, y: 0, at: 200 })).toEqual({ kind: 'none' });
    const second = tracker.move({ x: 220, y: 0, at: 300 });
    expect(second.kind).toBe('pet');
    if (second.kind === 'pet') expect(second.weight).toBeCloseTo(DEFAULT_GESTURE_CONFIG.rewardDecay, 5);

    // A stroke that already paid out is not also reported as a tap.
    expect(tracker.up({ x: 220, y: 0, at: 400 })).toEqual({ kind: 'none' });
  });

  it('decays repeated rewards down to the floor', () => {
    const tracker = createGestureTracker();
    tracker.down({ x: 0, y: 0, at: 0 });
    const weights: number[] = [];
    for (let index = 1; index <= 9; index += 1) {
      const result = tracker.move({ x: index * 200, y: 0, at: index * 100 });
      if (result.kind === 'pet') weights.push(result.weight);
    }
    expect(weights.length).toBeGreaterThanOrEqual(8);
    expect(weights[0]).toBe(1);
    for (let index = 1; index < weights.length; index += 1) {
      expect(weights[index] ?? 0).toBeLessThanOrEqual(weights[index - 1] ?? 0);
    }
    expect(weights[weights.length - 1]).toBeCloseTo(DEFAULT_GESTURE_CONFIG.minRewardWeight, 5);
  });

  it('forgets old rewards once the window has passed', () => {
    const tracker = createGestureTracker();
    tracker.down({ x: 0, y: 0, at: 0 });
    expect(tracker.move({ x: 100, y: 0, at: 0 })).toEqual({ kind: 'pet', weight: 1 });
    tracker.up({ x: 100, y: 0, at: 10 });

    const later = DEFAULT_GESTURE_CONFIG.rewardWindowMs + 1_000;
    tracker.down({ x: 0, y: 0, at: later });
    expect(tracker.move({ x: 100, y: 0, at: later })).toEqual({ kind: 'pet', weight: 1 });
  });

  it('accumulates path length and resets on cancel', () => {
    const tracker = createGestureTracker();
    tracker.down({ x: 0, y: 0, at: 0 });
    tracker.move({ x: 0, y: 30, at: 50 });
    tracker.move({ x: 40, y: 30, at: 100 });
    expect(tracker.distance()).toBeCloseTo(70, 5);

    tracker.cancel();
    expect(tracker.isActive()).toBe(false);
    expect(tracker.distance()).toBe(0);
    expect(tracker.up({ x: 40, y: 30, at: 150 })).toEqual({ kind: 'none' });
  });

  it('ignores movement that never started with a press', () => {
    const tracker = createGestureTracker();
    expect(tracker.move({ x: 500, y: 500, at: 0 })).toEqual({ kind: 'none' });
    expect(tracker.up({ x: 500, y: 500, at: 0 })).toEqual({ kind: 'none' });
  });

  it('accepts a tighter configuration', () => {
    const tracker = createGestureTracker({ tapMaxDistance: 2, petMinDistance: 10 });
    tracker.down({ x: 0, y: 0, at: 0 });
    expect(tracker.up({ x: 5, y: 0, at: 100 })).toEqual({ kind: 'none' });
    tracker.down({ x: 0, y: 0, at: 200 });
    expect(tracker.move({ x: 12, y: 0, at: 250 }).kind).toBe('pet');
  });
});
