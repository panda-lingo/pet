import { describe, expect, it } from 'vitest';
import { INTERACTION_LINES, MISSING_TARGET_TOUR, MOOD_LINES, moodLine, TOURS, WELCOME_TOUR } from '../src/copy.js';
import type { Mood } from '../src/types.js';

const MOODS: Mood[] = ['neutral', 'happy', 'excited', 'curious', 'tired', 'hungry', 'lonely'];

describe('copy', () => {
  it('has lines for every mood and picks one deterministically', () => {
    for (const mood of MOODS) {
      expect(MOOD_LINES[mood].length).toBeGreaterThan(0);
      expect(moodLine(mood, 0)).toBe(MOOD_LINES[mood][0]);
      expect(moodLine(mood, 7)).toBe(MOOD_LINES[mood][7 % MOOD_LINES[mood].length]);
      expect(moodLine(mood, -3).length).toBeGreaterThan(0);
    }
    expect(INTERACTION_LINES.targetMissing.length).toBeGreaterThan(0);
  });
});

describe('tours', () => {
  it('exposes the welcome tour with unique, fully specified steps', () => {
    expect(WELCOME_TOUR.steps.length).toBeGreaterThanOrEqual(5);
    const ids = WELCOME_TOUR.steps.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const step of WELCOME_TOUR.steps) {
      expect(step.target).not.toBe('');
      expect(step.message.length).toBeGreaterThan(10);
      expect(step.completion.type).toBeDefined();
    }
  });

  it('covers all three completion styles and a cross-route step', () => {
    const completions = WELCOME_TOUR.steps.map((step) => step.completion.type);
    expect(completions).toContain('manual');
    expect(completions).toContain('target-click');
    expect(completions).toContain('site-event');
    const routed = WELCOME_TOUR.steps.filter((step) => step.route !== undefined);
    expect(routed.length).toBeGreaterThan(0);
    // The asynchronous target gets a bounded wait rather than the default.
    expect(routed[0]?.targetTimeoutMs).toBeGreaterThan(0);
  });

  it('ships a diagnostics tour whose first target cannot resolve', () => {
    const first = MISSING_TARGET_TOUR.steps[0];
    expect(first?.target).toBe('this-target-does-not-exist');
    expect(first?.targetTimeoutMs).toBeLessThanOrEqual(1_000);
    expect(MISSING_TARGET_TOUR.steps.length).toBeGreaterThan(1);
    expect(TOURS.map((tour) => tour.id)).toEqual(['welcome', 'diagnostics']);
  });
});
