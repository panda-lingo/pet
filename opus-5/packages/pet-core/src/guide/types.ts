/** Typed website-guide configuration. Targets are stable `data-pet-target` names. */

export type GuidePlacement = 'left' | 'right' | 'above' | 'below';

/** Pose the panda takes while a step is being read. */
export type GuideAction = 'point' | 'look' | 'wave' | 'celebrate' | 'sit';

export type GuideCompletion =
  | { type: 'manual' }
  | { type: 'target-click' }
  | { type: 'site-event'; event: string };

export interface GuideStep {
  id: string;
  /** Hash route the step lives on, e.g. `#courses`. Omitted means "current page". */
  route?: string;
  /** Value of the `data-pet-target` attribute on the website element. */
  target: string;
  message: string;
  preferredPlacement: GuidePlacement | 'auto';
  action: GuideAction;
  autoScroll?: boolean;
  completion: GuideCompletion;
  /** Bounded wait for asynchronously rendered targets. */
  targetTimeoutMs?: number;
}

export interface GuideTour {
  id: string;
  title: string;
  steps: readonly GuideStep[];
}

export type GuideStatus =
  | 'idle'
  | 'navigating'
  | 'waiting-for-target'
  | 'moving'
  | 'speaking'
  | 'target-missing'
  | 'completed'
  | 'exited';

export interface GuideState {
  tourId: string | null;
  status: GuideStatus;
  stepIndex: number;
  stepCount: number;
  step: GuideStep | null;
  /** Retry counter for the current step, surfaced in the missing-target UI. */
  attempt: number;
  active: boolean;
}

export const DEFAULT_TARGET_TIMEOUT_MS = 4_000;

export function targetSelector(target: string): string {
  return `[data-pet-target="${CSS.escape(target)}"]`;
}

/** Selector builder that does not need the DOM `CSS` global (used in tests/Node). */
export function targetSelectorSafe(target: string): string {
  return `[data-pet-target="${target.replace(/"/g, '\\"')}"]`;
}
