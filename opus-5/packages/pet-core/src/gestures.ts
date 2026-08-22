/**
 * Pointer gesture classification.
 *
 * A press on the panda can mean three things: a tap (short, still), a petting stroke
 * (enough accumulated movement), or nothing at all. Getting this wrong makes the pet
 * feel broken, so the thresholds live in one tested place.
 */
export interface GestureConfig {
  /** Movement below this is still considered a tap. */
  tapMaxDistance: number;
  tapMaxDurationMs: number;
  /** Accumulated path length that turns a press into petting. */
  petMinDistance: number;
  /** Extra path length before petting pays out again. */
  petRepeatDistance: number;
  /** Window over which repeated petting rewards decay. */
  rewardWindowMs: number;
  rewardDecay: number;
  minRewardWeight: number;
}

export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  tapMaxDistance: 8,
  tapMaxDurationMs: 350,
  petMinDistance: 48,
  petRepeatDistance: 120,
  rewardWindowMs: 60_000,
  rewardDecay: 0.7,
  minRewardWeight: 0.15,
};

export interface GesturePoint {
  x: number;
  y: number;
  at: number;
}

export type GestureResult = { kind: 'tap' } | { kind: 'pet'; weight: number } | { kind: 'none' };

export interface GestureTracker {
  down(point: GesturePoint): void;
  /** Returns a `pet` result on each payout threshold, otherwise `none`. */
  move(point: GesturePoint): GestureResult;
  up(point: GesturePoint): GestureResult;
  cancel(): void;
  isActive(): boolean;
  /** Path length of the active gesture; exposed for animation intensity. */
  distance(): number;
}

export function createGestureTracker(config: Partial<GestureConfig> = {}): GestureTracker {
  const cfg: GestureConfig = { ...DEFAULT_GESTURE_CONFIG, ...config };
  let active = false;
  let start: GesturePoint | null = null;
  let last: GesturePoint | null = null;
  let travelled = 0;
  let payouts = 0;
  let nextPayoutAt = cfg.petMinDistance;
  let rewardHistory: number[] = [];

  const rewardWeight = (now: number): number => {
    rewardHistory = rewardHistory.filter((at) => now - at <= cfg.rewardWindowMs);
    const weight = Math.pow(cfg.rewardDecay, rewardHistory.length);
    rewardHistory.push(now);
    return Math.max(cfg.minRewardWeight, weight);
  };

  return {
    down(point) {
      active = true;
      start = point;
      last = point;
      travelled = 0;
      payouts = 0;
      nextPayoutAt = cfg.petMinDistance;
    },
    move(point) {
      if (!active || !last) return { kind: 'none' };
      travelled += Math.hypot(point.x - last.x, point.y - last.y);
      last = point;
      if (travelled >= nextPayoutAt) {
        payouts += 1;
        nextPayoutAt += cfg.petRepeatDistance;
        return { kind: 'pet', weight: rewardWeight(point.at) };
      }
      return { kind: 'none' };
    },
    up(point) {
      if (!active || !start) return { kind: 'none' };
      const straight = Math.hypot(point.x - start.x, point.y - start.y);
      const duration = point.at - start.at;
      const paid = payouts > 0;
      active = false;
      start = null;
      last = null;
      if (paid) return { kind: 'none' };
      if (straight <= cfg.tapMaxDistance && duration <= cfg.tapMaxDurationMs) return { kind: 'tap' };
      // A slow drag that never reached the petting threshold is intentionally ignored:
      // it is usually the user starting a text selection or a scroll.
      return { kind: 'none' };
    },
    cancel() {
      active = false;
      start = null;
      last = null;
      travelled = 0;
      payouts = 0;
    },
    isActive: () => active,
    distance: () => travelled,
  };
}
