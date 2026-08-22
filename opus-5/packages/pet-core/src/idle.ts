import type { MotionCapabilities } from './motion.js';
import type { Activity, Mood, Needs } from './types.js';

/**
 * Idle behaviour is chosen by weighted random selection with per-action cooldowns, so
 * the panda never loops the same trick mechanically.
 */
export type IdleAction =
  | 'blink'
  | 'lookAround'
  | 'earTwitch'
  | 'tailWag'
  | 'stretch'
  | 'sit'
  | 'inspectPointer'
  | 'inspectTarget'
  | 'yawn'
  | 'sleep';

export const IDLE_ACTIONS: readonly IdleAction[] = [
  'blink',
  'lookAround',
  'earTwitch',
  'tailWag',
  'stretch',
  'sit',
  'inspectPointer',
  'inspectTarget',
  'yawn',
  'sleep',
];

export const IDLE_COOLDOWN_MS: Record<IdleAction, number> = {
  blink: 1_800,
  lookAround: 9_000,
  earTwitch: 7_000,
  tailWag: 6_000,
  stretch: 24_000,
  sit: 30_000,
  inspectPointer: 12_000,
  inspectTarget: 20_000,
  yawn: 26_000,
  sleep: 60_000,
};

export interface IdleContext {
  mood: Mood;
  needs: Needs;
  activity: Activity;
  now: number;
  lastPerformedAt: Partial<Record<IdleAction, number>>;
  /** True while an input, textarea or contenteditable element holds focus. */
  typing: boolean;
  guideActive: boolean;
  pointerNearby: boolean;
  targetNearby: boolean;
  capabilities: MotionCapabilities;
}

export function idleWeights(context: IdleContext): Record<IdleAction, number> {
  const { mood, needs } = context;
  const weights: Record<IdleAction, number> = {
    blink: 30,
    lookAround: mood === 'curious' ? 26 : 10,
    earTwitch: 12,
    tailWag: mood === 'happy' || mood === 'excited' ? 22 : 8,
    stretch: needs.energy < 50 ? 14 : 6,
    sit: needs.energy < 40 ? 16 : 5,
    inspectPointer: context.pointerNearby ? 24 : 0,
    inspectTarget: context.targetNearby ? 18 : 0,
    yawn: mood === 'tired' ? 20 : needs.energy < 35 ? 10 : 2,
    sleep: needs.energy < 15 && mood === 'tired' ? 30 : 0,
  };

  // While the user is typing or a guide step is live, only blinking is allowed:
  // everything else pulls attention away from the task.
  if (context.typing || context.guideActive) {
    for (const action of IDLE_ACTIONS) if (action !== 'blink') weights[action] = 0;
  }

  if (context.activity !== 'idle') {
    for (const action of IDLE_ACTIONS) if (action !== 'blink' && action !== 'earTwitch') weights[action] = 0;
  }

  if (!context.capabilities.tailMotion) weights.tailWag = 0;
  if (!context.capabilities.blinking) weights.blink = 0;

  for (const action of IDLE_ACTIONS) {
    const last = context.lastPerformedAt[action];
    if (typeof last === 'number' && context.now - last < IDLE_COOLDOWN_MS[action]) weights[action] = 0;
  }

  return weights;
}

/** Returns `null` when nothing is eligible — the caller simply waits and asks again. */
export function selectIdleAction(context: IdleContext, rng: () => number = Math.random): IdleAction | null {
  if (!context.capabilities.idleActions) return null;
  const weights = idleWeights(context);
  let total = 0;
  for (const action of IDLE_ACTIONS) total += weights[action];
  if (total <= 0) return null;

  let roll = rng() * total;
  for (const action of IDLE_ACTIONS) {
    roll -= weights[action];
    if (roll <= 0) return action;
  }
  return null;
}
