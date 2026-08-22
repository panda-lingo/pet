import { describe, expect, it } from 'vitest';
import { IDLE_ACTIONS, IDLE_COOLDOWN_MS, idleWeights, selectIdleAction, type IdleContext } from '../src/idle.js';
import { capabilitiesFor, mulberry32 } from '../src/motion.js';
import { defaultNeeds } from '../src/needs.js';

const NOW = 100_000;

const context = (patch: Partial<IdleContext> = {}): IdleContext => ({
  mood: 'neutral',
  needs: defaultNeeds(),
  activity: 'idle',
  now: NOW,
  lastPerformedAt: {},
  typing: false,
  guideActive: false,
  pointerNearby: false,
  targetNearby: false,
  capabilities: capabilitiesFor('calm'),
  ...patch,
});

const draw = (ctx: IdleContext, rounds = 200): Set<string> => {
  const rng = mulberry32(0xbeef);
  const seen = new Set<string>();
  for (let index = 0; index < rounds; index += 1) {
    const action = selectIdleAction(ctx, rng);
    seen.add(action ?? 'null');
  }
  return seen;
};

describe('idle behaviour', () => {
  it('performs no idle action at all under reduced motion', () => {
    const still = context({ capabilities: capabilitiesFor('still') });
    expect(selectIdleAction(still, () => 0.5)).toBeNull();
    expect(draw(still, 20)).toEqual(new Set(['null']));
    const weights = idleWeights(still);
    expect(weights.blink).toBe(0);
    expect(weights.tailWag).toBe(0);
  });

  it('only blinks while the user is typing', () => {
    expect(draw(context({ typing: true }))).toEqual(new Set(['blink']));
  });

  it('only blinks while a guide step is live', () => {
    expect(draw(context({ guideActive: true }))).toEqual(new Set(['blink']));
  });

  it('limits itself to small tics while walking or sleeping', () => {
    const walking = draw(context({ activity: 'walking' }));
    for (const action of walking) expect(['blink', 'earTwitch']).toContain(action);
    expect(walking.size).toBeGreaterThan(1);
  });

  it('respects per-action cooldowns and can end up with nothing to do', () => {
    const justBlinked = context({ typing: true, lastPerformedAt: { blink: NOW - 100 } });
    expect(idleWeights(justBlinked).blink).toBe(0);
    expect(selectIdleAction(justBlinked, () => 0.5)).toBeNull();

    const cooledDown = context({ typing: true, lastPerformedAt: { blink: NOW - IDLE_COOLDOWN_MS.blink - 1 } });
    expect(selectIdleAction(cooledDown, () => 0.5)).toBe('blink');
  });

  it('reacts to what is happening on the page', () => {
    expect(idleWeights(context({ pointerNearby: false })).inspectPointer).toBe(0);
    expect(idleWeights(context({ pointerNearby: true })).inspectPointer).toBeGreaterThan(0);
    expect(idleWeights(context({ targetNearby: false })).inspectTarget).toBe(0);
    expect(idleWeights(context({ targetNearby: true })).inspectTarget).toBeGreaterThan(0);
  });

  it('lets mood and energy bias the weighting', () => {
    expect(idleWeights(context({ mood: 'curious' })).lookAround).toBeGreaterThan(
      idleWeights(context({ mood: 'neutral' })).lookAround,
    );
    expect(idleWeights(context({ mood: 'happy' })).tailWag).toBeGreaterThan(
      idleWeights(context({ mood: 'neutral' })).tailWag,
    );
    expect(idleWeights(context({ mood: 'tired' })).yawn).toBeGreaterThan(
      idleWeights(context({ mood: 'neutral' })).yawn,
    );
    const drained = context({ needs: { ...defaultNeeds(), energy: 10 }, mood: 'tired' });
    expect(idleWeights(drained).sleep).toBeGreaterThan(0);
    expect(idleWeights(context({ mood: 'tired' })).sleep).toBe(0);
  });

  it('varies its choices instead of looping one trick', () => {
    const seen = draw(context({ mood: 'curious', pointerNearby: true }));
    expect(seen.size).toBeGreaterThanOrEqual(4);
    for (const action of seen) expect([...IDLE_ACTIONS, 'null']).toContain(action);
  });
});
