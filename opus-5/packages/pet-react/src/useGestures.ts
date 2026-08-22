import { useCallback, useEffect, useMemo } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { clamp01, createGestureTracker } from '@pet/core';
import { usePet } from './context.js';

/** Path length that reads as "full intensity" for the petting animation. */
const INTENSITY_SPAN = 180;

export interface PetGestureHandlers {
  onPointerEnter(): void;
  onPointerLeave(): void;
  onPointerDown(event: ReactPointerEvent<HTMLElement>): void;
  onPointerMove(event: ReactPointerEvent<HTMLElement>): void;
  onPointerUp(event: ReactPointerEvent<HTMLElement>): void;
  onPointerCancel(): void;
  onKeyDown(event: ReactKeyboardEvent<HTMLElement>): void;
}

/**
 * Turns raw pointer events on the pet into domain gestures.
 *
 * Classification lives in `@pet/core` so both renderers behave identically; this hook only
 * owns the DOM wiring and the live petting intensity, which is pushed straight into the
 * mutable runtime instead of React state.
 */
export function useGestures(): PetGestureHandlers {
  const { actions } = usePet();
  const tracker = useMemo(() => createGestureTracker(), []);

  const release = useCallback(() => {
    tracker.cancel();
    actions.setPetting(0);
  }, [actions, tracker]);

  useEffect(() => release, [release]);

  return useMemo<PetGestureHandlers>(
    () => ({
      onPointerEnter: () => actions.setHovered(true),
      onPointerLeave() {
        actions.setHovered(false);
        if (tracker.isActive()) release();
      },
      onPointerDown(event) {
        // Capture keeps the stroke alive when the pointer wanders off the small hit area.
        event.currentTarget.setPointerCapture?.(event.pointerId);
        tracker.down({ x: event.clientX, y: event.clientY, at: event.timeStamp });
      },
      onPointerMove(event) {
        if (!tracker.isActive()) return;
        const result = tracker.move({ x: event.clientX, y: event.clientY, at: event.timeStamp });
        actions.setPetting(clamp01(tracker.distance() / INTENSITY_SPAN));
        if (result.kind === 'pet') actions.petted(result.weight);
      },
      onPointerUp(event) {
        const result = tracker.up({ x: event.clientX, y: event.clientY, at: event.timeStamp });
        if (result.kind === 'tap') actions.tap();
        release();
      },
      onPointerCancel: release,
      onKeyDown(event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        actions.tap();
      },
    }),
    [actions, release, tracker],
  );
}
