import { useMemo } from 'react';
import { INTERACTION_LINES } from '@pet/core';
import { usePet } from './context.js';

/** Shown while the engine navigates or waits for a target that has not mounted yet. */
const PENDING_LINE = 'One moment — I am looking for it.';

/** Everything the tour UI needs, flattened out of the engine's state machine. */
export interface GuideView {
  active: boolean;
  /** Step copy, or the recovery line when the target never appeared. */
  message: string | null;
  missing: boolean;
  /** Navigating or waiting: the step controls are not meaningful yet. */
  pending: boolean;
  attempt: number;
  stepIndex: number;
  stepCount: number;
  canGoBack: boolean;
  isLastStep: boolean;
  title: string | null;
  next(): void;
  back(): void;
  skip(): void;
  retry(): void;
  exit(): void;
  start(tourId: string): void;
}

export function useGuide(): GuideView {
  const { guide, guideState, tours, actions } = usePet();

  return useMemo<GuideView>(() => {
    const missing = guideState.status === 'target-missing';
    const speaking = guideState.status === 'speaking' || guideState.status === 'moving';
    const pending = guideState.status === 'navigating' || guideState.status === 'waiting-for-target';
    const message = missing
      ? INTERACTION_LINES.targetMissing
      : speaking
        ? (guideState.step?.message ?? null)
        : pending
          ? PENDING_LINE
          : null;
    return {
      active: guideState.active,
      message,
      missing,
      pending,
      attempt: guideState.attempt,
      stepIndex: guideState.stepIndex,
      stepCount: guideState.stepCount,
      canGoBack: guideState.stepIndex > 0,
      isLastStep: guideState.stepIndex >= guideState.stepCount - 1,
      title: tours.find((tour) => tour.id === guideState.tourId)?.title ?? null,
      next: guide.next,
      back: guide.back,
      skip: guide.skip,
      retry: guide.retry,
      exit: guide.exit,
      start: actions.startTour,
    };
  }, [actions, guide, guideState, tours]);
}
