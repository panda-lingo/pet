import { describe, expect, it } from 'vitest';
import {
  deriveMood,
  MOOD_HYSTERESIS_MARGIN,
  MOOD_MIN_DWELL_MS,
  MOOD_NEUTRAL_FLOOR,
  pruneEvents,
  scoreMoods,
} from '../src/mood.js';
import { defaultNeeds } from '../src/needs.js';
import type { PetEvent } from '../src/types.js';

const NOW = 1_000_000;
const needs = (patch: Partial<ReturnType<typeof defaultNeeds>> = {}) => ({ ...defaultNeeds(), ...patch });
const derive = (input: Parameters<typeof deriveMood>[0]) => deriveMood(input).mood;

describe('mood derivation', () => {
  it('reports neutral when every need is comfortable', () => {
    expect(derive({ needs: needs(), recentEvents: [], now: NOW })).toBe('neutral');
    expect(scoreMoods(needs(), [], NOW).neutral).toBe(MOOD_NEUTRAL_FLOOR);
  });

  it('maps each need profile onto the expected mood', () => {
    expect(derive({ needs: needs({ energy: 10 }), recentEvents: [], now: NOW })).toBe('tired');
    expect(derive({ needs: needs({ hunger: 90 }), recentEvents: [], now: NOW })).toBe('hungry');
    expect(derive({ needs: needs({ affection: 5 }), recentEvents: [], now: NOW })).toBe('lonely');
    expect(derive({ needs: needs({ curiosity: 100 }), recentEvents: [], now: NOW })).toBe('curious');
  });

  it('becomes excited from a burst of interactions and happy from lingering warmth', () => {
    const burst: PetEvent[] = [
      { kind: 'PETTED', at: NOW - 800, weight: 1 },
      { kind: 'CLICKED', at: NOW - 1_200, weight: 1 },
    ];
    expect(derive({ needs: needs(), recentEvents: burst, now: NOW })).toBe('excited');

    const lingering: PetEvent[] = [{ kind: 'PETTED', at: NOW - 20_000, weight: 1 }];
    expect(derive({ needs: needs({ affection: 90 }), recentEvents: lingering, now: NOW })).toBe('happy');
  });

  it('will not let an exhausted pet become excited', () => {
    const burst: PetEvent[] = [
      { kind: 'PETTED', at: NOW - 500, weight: 1 },
      { kind: 'PETTED', at: NOW - 900, weight: 1 },
    ];
    const drained = needs({ energy: 20 });
    const scores = scoreMoods(drained, burst, NOW);
    expect(scores.excited).toBe(0);
    expect(scores.tired).toBeGreaterThan(0);
    // The warmth of those same events still registers, so the face reads happy, not manic.
    expect(derive({ needs: drained, recentEvents: burst, now: NOW })).toBe('happy');

    // Once the warmth has faded, exhaustion is the loudest signal again.
    const stale: PetEvent[] = burst.map((event) => ({ ...event, at: NOW - 25_000 }));
    expect(derive({ needs: drained, recentEvents: stale, now: NOW })).toBe('tired');
  });

  it('ignores events with a future timestamp', () => {
    const scores = scoreMoods(needs(), [{ kind: 'PETTED', at: NOW + 5_000, weight: 1 }], NOW);
    expect(scores.excited).toBe(0);
    expect(scores.happy).toBe(0);
  });

  it('holds the current mood until the minimum dwell time has passed', () => {
    const input = { needs: needs({ curiosity: 100 }), recentEvents: [], now: NOW, current: 'neutral' as const };
    expect(derive({ ...input, moodChangedAt: NOW })).toBe('neutral');
    expect(derive({ ...input, now: NOW + MOOD_MIN_DWELL_MS - 1, moodChangedAt: NOW })).toBe('neutral');
    expect(derive({ ...input, now: NOW + MOOD_MIN_DWELL_MS, moodChangedAt: NOW })).toBe('curious');
  });

  it('requires the hysteresis margin before swapping moods', () => {
    const settled = { recentEvents: [], now: NOW + 60_000, current: 'curious' as const, moodChangedAt: NOW };
    const close = needs({ curiosity: 90, hunger: 70 });
    const closeScores = scoreMoods(close, [], settled.now);
    expect(closeScores.hungry - closeScores.curious).toBeLessThan(MOOD_HYSTERESIS_MARGIN);
    expect(derive({ ...settled, needs: close })).toBe('curious');

    const clear = needs({ curiosity: 90, hunger: 80 });
    const clearScores = scoreMoods(clear, [], settled.now);
    expect(clearScores.hungry - clearScores.curious).toBeGreaterThanOrEqual(MOOD_HYSTERESIS_MARGIN);
    expect(derive({ ...settled, needs: clear })).toBe('hungry');
  });

  it('stamps the change time only when the mood actually changes', () => {
    const first = deriveMood({ needs: needs({ energy: 5 }), recentEvents: [], now: NOW });
    expect(first.moodChangedAt).toBe(NOW);
    const held = deriveMood({
      needs: needs({ energy: 5 }),
      recentEvents: [],
      now: NOW + 10_000,
      current: first.mood,
      moodChangedAt: NOW,
    });
    expect(held.mood).toBe('tired');
    expect(held.moodChangedAt).toBe(NOW);
  });

  it('prunes stale events and bounds the buffer', () => {
    const events: PetEvent[] = [
      { kind: 'CLICKED', at: NOW - 40_000 },
      { kind: 'CLICKED', at: NOW - 1_000 },
    ];
    expect(pruneEvents(events, NOW)).toEqual([{ kind: 'CLICKED', at: NOW - 1_000 }]);

    const many: PetEvent[] = Array.from({ length: 40 }, (_, index) => ({ kind: 'CLICKED', at: NOW - index }));
    expect(pruneEvents(many, NOW)).toHaveLength(24);
  });
});
