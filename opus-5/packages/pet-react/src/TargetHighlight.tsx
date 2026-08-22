import type { ReactElement } from 'react';
import { petZIndex } from '@pet/core';
import { usePet } from './context.js';

const PAD = 8;

/**
 * Spotlight around the current tour target. Purely decorative — `pointer-events: none`
 * keeps the underlying element clickable, which the `target-click` completion depends on.
 */
export function TargetHighlight(): ReactElement | null {
  const { highlight, guideState } = usePet();
  if (!highlight || !guideState.active) return null;
  return (
    <div
      className="pl-pet-highlight"
      aria-hidden="true"
      style={{
        zIndex: petZIndex - 1,
        left: `${Math.round(highlight.x - PAD)}px`,
        top: `${Math.round(highlight.y - PAD)}px`,
        width: `${Math.round(highlight.width + PAD * 2)}px`,
        height: `${Math.round(highlight.height + PAD * 2)}px`,
      }}
    />
  );
}
