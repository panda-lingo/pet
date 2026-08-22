import { brandDuration } from './brand.js';
import { clamp } from './types.js';

/**
 * Three motion profiles instead of a boolean:
 * - `still`: `prefers-reduced-motion` / a static frame, repositioning is instant
 * - `calm`:  the brand default — breathing, floating, blinking, gaze, one nod
 * - `full`:  the showcase profile the briefs describe (walking, hops, particles)
 */
export type MotionProfile = 'still' | 'calm' | 'full';

export interface MotionCapabilities {
  breathing: boolean;
  blinking: boolean;
  idleActions: boolean;
  headTracking: boolean;
  pupilTracking: boolean;
  tailMotion: boolean;
  squash: boolean;
  walk: boolean;
  jump: boolean;
  particles: boolean;
  /** Amplitude multiplier applied to every oscillation. */
  amplitude: number;
  /** Duration of a move between two positions on the page. */
  travelMs: number;
}

export const MOTION_CAPABILITIES: Record<MotionProfile, MotionCapabilities> = {
  still: {
    breathing: false,
    blinking: false,
    idleActions: false,
    headTracking: false,
    pupilTracking: false,
    tailMotion: false,
    squash: false,
    walk: false,
    jump: false,
    particles: false,
    amplitude: 0,
    travelMs: 0,
  },
  calm: {
    breathing: true,
    blinking: true,
    idleActions: true,
    headTracking: true,
    pupilTracking: true,
    tailMotion: true,
    squash: true,
    walk: false,
    jump: false,
    particles: false,
    amplitude: 0.62,
    travelMs: brandDuration.slow,
  },
  full: {
    breathing: true,
    blinking: true,
    idleActions: true,
    headTracking: true,
    pupilTracking: true,
    tailMotion: true,
    squash: true,
    walk: true,
    jump: true,
    particles: true,
    amplitude: 1,
    travelMs: 1_100,
  },
};

/**
 * `prefers-reduced-motion` decides the default. An override is only ever set by the
 * user pressing the in-pet motion control, so an explicit choice is honoured — that
 * control is the documented escape hatch, and it starts unset.
 */
export function resolveMotionProfile(
  prefersReducedMotion: boolean,
  override: MotionProfile | null,
): MotionProfile {
  if (override) return override;
  return prefersReducedMotion ? 'still' : 'calm';
}

export function capabilitiesFor(profile: MotionProfile): MotionCapabilities {
  return MOTION_CAPABILITIES[profile];
}

/** Frame-rate independent exponential approach. `lambda` is "per second" stiffness. */
export function damp(current: number, target: number, lambda: number, dtSeconds: number): number {
  if (dtSeconds <= 0) return current;
  const t = 1 - Math.exp(-lambda * dtSeconds);
  return current + (target - current) * t;
}

export function easeOutCubic(t: number): number {
  const k = clamp(t, 0, 1);
  return 1 - Math.pow(1 - k, 3);
}

export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * clamp(t, 0, 1)) - 1) / 2;
}

/** Small deterministic PRNG so idle behaviour and blinks are reproducible in tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}
