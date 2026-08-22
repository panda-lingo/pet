/** Shared domain vocabulary for the website pet. */

export type LifeStage = 'baby' | 'young' | 'adult';

export type Mood = 'neutral' | 'happy' | 'excited' | 'curious' | 'tired' | 'hungry' | 'lonely';

export type Activity = 'idle' | 'walking' | 'guiding' | 'reacting' | 'playing' | 'sleeping';

export type NeedKey = 'energy' | 'hunger' | 'affection' | 'curiosity' | 'trust';

/**
 * All needs are 0–100.
 *
 * Direction matters and is easy to get wrong, so it is fixed here:
 * - energy      100 = rested,      0 = exhausted
 * - hunger      100 = starving,    0 = fully fed   (it measures *hunger*, not satiety)
 * - affection   100 = feels loved, 0 = neglected
 * - curiosity   100 = eager,       0 = incurious
 * - trust       100 = bonded,      0 = wary
 */
export type Needs = Record<NeedKey, number>;

export type PetEventKind =
  | 'CLICKED'
  | 'PETTED'
  | 'FED'
  | 'PLAYED'
  | 'TOUR_STEP_COMPLETED'
  | 'TOUR_COMPLETED'
  | 'USER_RETURNED'
  | 'IGNORED';

export interface PetEvent {
  kind: PetEventKind;
  at: number;
  /** 0–1 reward scale; petting the pet repeatedly earns less each time. */
  weight?: number;
}

export interface PetPreferences {
  hidden: boolean;
  paused: boolean;
  muted: boolean;
  /** `null` follows the OS `prefers-reduced-motion` setting. */
  motionOverride: 'still' | 'calm' | 'full' | null;
}

export interface PetSnapshot {
  schemaVersion: number;
  bornAt: number;
  lastUpdatedAt: number;
  stage: LifeStage;
  /** 0–1 progress through the current stage. */
  stageProgress: number;
  xp: number;
  energy: number;
  hunger: number;
  affection: number;
  curiosity: number;
  trust: number;
  completedTours: string[];
  unlockedActions: string[];
  hidden: boolean;
  paused: boolean;
  muted: boolean;
  motionOverride: 'still' | 'calm' | 'full' | null;
}

/** Proportions that give each life stage a visibly different silhouette. */
export interface StageParams {
  headScale: number;
  bodyScale: number;
  eyeScale: number;
  earScale: number;
  legLength: number;
  tailLength: number;
  overallScale: number;
  /** Multiplier on walk speed and idle animation rate. */
  movementSpeed: number;
  /** Cheek markings only appear once the panda grows up a little. */
  showMarkings: boolean;
}

export interface PetState {
  needs: Needs;
  mood: Mood;
  moodChangedAt: number;
  activity: Activity;
  stage: LifeStage;
  stageProgress: number;
  xp: number;
  bornAt: number;
  lastUpdatedAt: number;
  lastInteractionAt: number;
  completedTours: string[];
  unlockedActions: string[];
  preferences: PetPreferences;
  recentEvents: PetEvent[];
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return value < min ? min : value > max ? max : value;
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
