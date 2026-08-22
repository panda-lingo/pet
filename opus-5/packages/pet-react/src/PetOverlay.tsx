import type { ReactElement, ReactNode } from 'react';
import { petZIndex } from '@pet/core';
import { usePet } from './context.js';
import { PetControls } from './PetControls.js';
import { SpeechBubble } from './SpeechBubble.js';
import { TargetHighlight } from './TargetHighlight.js';
import { useGestures } from './useGestures.js';

export interface PetOverlayProps {
  /** The renderer's pet visual. It fills the pet box; everything else is shared chrome. */
  children?: ReactNode;
  /**
   * Renderer surface placed *behind* the hit area rather than inside it.
   *
   * Solution B's canvas is deliberately larger than the pet box so that hops, stretches and
   * particles have room, and it must not be a child of the `<button>` — a canvas that big inside
   * the hit area would make the hit area that big too.
   */
  behind?: ReactNode;
  label?: string;
}

/**
 * Renderer-agnostic chrome: the positioned pet box, the hit area, the bubble, the
 * highlight and the controls. The SVG solution puts an `<svg>` inside it; the PixiJS
 * solution puts nothing inside it and draws on its own canvas behind it.
 *
 * The box is moved with `translate3d` (never `left`/`top`) and its transition duration is
 * taken from the motion profile, so `moveTo()` resolving and the travel ending agree.
 */
export function PetOverlay({
  children,
  behind,
  label = 'Panda, your speaking companion',
}: PetOverlayProps): ReactElement {
  const { position, size, capabilities, state, engaged, motion, breakpoint, speech } = usePet();
  const hidden = state.preferences.hidden;
  const handlers = useGestures();

  return (
    <>
      <TargetHighlight />
      <div
        className="pl-pet-root"
        data-testid="pet-root"
        data-engaged={engaged ? 'true' : 'false'}
        data-motion={motion}
        data-breakpoint={breakpoint}
        data-mood={state.mood}
        data-stage={state.stage}
        data-speaking={speech ? 'true' : 'false'}
        aria-hidden={hidden ? 'true' : undefined}
        style={{
          zIndex: petZIndex,
          width: `${size}px`,
          height: `${size}px`,
          transform: `translate3d(${Math.round(position.x)}px, ${Math.round(position.y)}px, 0)`,
          transitionDuration: `${capabilities.travelMs}ms`,
          visibility: hidden ? 'hidden' : 'visible',
        }}
      >
        {behind}
        <button type="button" className="pl-pet-hit" aria-label={label} data-testid="pet-hit" {...handlers}>
          {children}
        </button>
        <SpeechBubble />
      </div>
      <PetControls />
    </>
  );
}
