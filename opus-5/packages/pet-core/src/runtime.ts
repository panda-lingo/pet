import { capabilitiesFor, type MotionCapabilities, type MotionProfile } from './motion.js';
import { defaultNeeds } from './needs.js';
import { STAGE_PARAMS } from './lifecycle.js';
import type { Activity, LifeStage, Mood, Needs, StageParams } from './types.js';

/** Pose the character holds; one-shot reactions are layered on top of it. */
export type PetPose = 'stand' | 'sit' | 'sleep' | 'walk' | 'point' | 'wave' | 'celebrate';

export type ReactionKind =
  | 'nod'
  | 'squash'
  | 'bounce'
  | 'jump'
  | 'heart'
  | 'sparkle'
  | 'wave'
  | 'blink'
  | 'earTwitch'
  | 'stretch'
  | 'yawn'
  | 'lookAround';

/**
 * The single mutable object shared between React and whichever renderer is mounted.
 *
 * React writes to it inside effects (never per frame); the renderer reads it every
 * frame. This is what keeps animation values out of React state in both solutions.
 */
export interface PetRuntimeState {
  mood: Mood;
  activity: Activity;
  stage: LifeStage;
  stageParams: StageParams;
  needs: Needs;
  motion: MotionProfile;
  capabilities: MotionCapabilities;
  pose: PetPose;
  /** Gaze target in pet-local normalised space, clamped to −1…1 by the caller. */
  gaze: { x: number; y: number };
  pointerInside: boolean;
  /** 0–1 petting intensity while a stroke is in progress. */
  petting: number;
  speaking: boolean;
  facing: 1 | -1;
  /** True while the pet is engaged (companion size) rather than docked. */
  engaged: boolean;
  sizePx: number;
  visible: boolean;
  paused: boolean;
  typing: boolean;
  guideActive: boolean;
  targetFps: 30 | 60;
}

export interface PetRuntime {
  readonly state: PetRuntimeState;
  set(patch: Partial<PetRuntimeState>): void;
  trigger(kind: ReactionKind): void;
  /** Drains the queue; the renderer calls this once per frame. */
  takeReactions(): ReactionKind[];
}

export function createRuntimeState(overrides: Partial<PetRuntimeState> = {}): PetRuntimeState {
  const motion = overrides.motion ?? 'calm';
  const stage = overrides.stage ?? 'adult';
  return {
    mood: 'neutral',
    activity: 'idle',
    stage,
    // Both of these are derived so that `createRuntimeState({ motion: 'still' })` or
    // `{ stage: 'baby' }` cannot leave the adult/calm values in place. Explicit
    // `capabilities` / `stageParams` overrides still win in the spread below.
    stageParams: STAGE_PARAMS[stage],
    needs: defaultNeeds(),
    motion,
    capabilities: capabilitiesFor(motion),
    pose: 'stand',
    gaze: { x: 0, y: 0 },
    pointerInside: false,
    petting: 0,
    speaking: false,
    facing: 1,
    engaged: false,
    sizePx: 64,
    visible: true,
    paused: false,
    typing: false,
    guideActive: false,
    targetFps: 60,
    ...overrides,
  };
}

export function createPetRuntime(overrides: Partial<PetRuntimeState> = {}): PetRuntime {
  const state = createRuntimeState(overrides);
  let queue: ReactionKind[] = [];
  return {
    state,
    set(patch) {
      Object.assign(state, patch);
      // Keep the derived fields in step, unless the caller supplied them itself (the React
      // bridge passes blended `stageParams` while a pet is growing between stages).
      if (patch.motion && patch.capabilities === undefined) state.capabilities = capabilitiesFor(patch.motion);
      if (patch.stage && patch.stageParams === undefined) state.stageParams = STAGE_PARAMS[patch.stage];
    },
    trigger(kind) {
      // Bounded queue: a stuck renderer must not accumulate work forever.
      if (queue.length < 12) queue.push(kind);
    },
    takeReactions() {
      if (queue.length === 0) return [];
      const drained = queue;
      queue = [];
      return drained;
    },
  };
}
