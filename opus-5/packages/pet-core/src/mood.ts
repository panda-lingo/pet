import type { Mood, Needs, PetEvent } from './types.js';
import { clamp } from './types.js';
import { isPositiveEvent } from './needs.js';

/**
 * Mood is *derived*, never assigned by UI code: components report events, this module
 * decides how the panda feels.
 *
 * Each mood produces an urgency score; the highest wins. Two guards stop the face from
 * flickering between neighbouring states:
 *   1. a challenger must beat the incumbent by `MOOD_HYSTERESIS_MARGIN`
 *   2. the incumbent must have been held for `MOOD_MIN_DWELL_MS`
 */
export const MOOD_HYSTERESIS_MARGIN = 8;
export const MOOD_MIN_DWELL_MS = 4_000;

/** Baseline score for `neutral`, i.e. how loud another mood must be to take over. */
export const MOOD_NEUTRAL_FLOOR = 18;

const EXCITED_WINDOW_MS = 6_000;
const HAPPY_WINDOW_MS = 30_000;

export interface MoodInput {
  needs: Needs;
  recentEvents: readonly PetEvent[];
  now: number;
  current?: Mood;
  moodChangedAt?: number;
}

export interface MoodResult {
  mood: Mood;
  moodChangedAt: number;
  scores: Record<Mood, number>;
}

export function scoreMoods(needs: Needs, recentEvents: readonly PetEvent[], now: number): Record<Mood, number> {
  let burst = 0;
  let warmth = 0;
  for (const event of recentEvents) {
    if (!isPositiveEvent(event.kind)) continue;
    const age = now - event.at;
    if (age < 0) continue;
    const weight = clamp(event.weight ?? 1, 0, 1);
    if (age <= EXCITED_WINDOW_MS) burst += weight;
    if (age <= HAPPY_WINDOW_MS) warmth += weight * (1 - age / HAPPY_WINDOW_MS);
  }

  const tired = Math.max(0, 40 - needs.energy) * 2;
  const hungry = Math.max(0, needs.hunger - 45) * 1.8;
  const lonely = Math.max(0, 35 - needs.affection) * 1.8;
  const curious = Math.max(0, needs.curiosity - 55) * 1.2;
  // A tired panda cannot get excited, which keeps "excited" from fighting "tired".
  const excited = needs.energy > 25 ? Math.min(70, burst * 34) : 0;
  const happy = Math.min(60, warmth * 26 + Math.max(0, needs.affection - 60) * 0.4);

  return { neutral: MOOD_NEUTRAL_FLOOR, happy, excited, curious, tired, hungry, lonely };
}

export function deriveMood(input: MoodInput): MoodResult {
  const { needs, recentEvents, now } = input;
  const scores = scoreMoods(needs, recentEvents, now);
  const current = input.current;
  let best: Mood = 'neutral';
  for (const mood of Object.keys(scores) as Mood[]) {
    if (scores[mood] > scores[best]) best = mood;
  }

  if (!current) return { mood: best, moodChangedAt: now, scores };
  if (best === current) return { mood: current, moodChangedAt: input.moodChangedAt ?? now, scores };

  const changedAt = input.moodChangedAt ?? now;
  const dwelled = now - changedAt >= MOOD_MIN_DWELL_MS;
  const clearlyBetter = scores[best] >= scores[current] + MOOD_HYSTERESIS_MARGIN;
  if (dwelled && clearlyBetter) return { mood: best, moodChangedAt: now, scores };
  return { mood: current, moodChangedAt: changedAt, scores };
}

/** Drops events that no longer influence mood, so the buffer cannot grow forever. */
export function pruneEvents(events: readonly PetEvent[], now: number, keepMs = HAPPY_WINDOW_MS): PetEvent[] {
  return events.filter((event) => now - event.at <= keepMs).slice(-24);
}
