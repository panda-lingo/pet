import type { ReactElement } from 'react';
import { usePet } from './context.js';
import { useGuide } from './useGuide.js';

/**
 * The pet's single voice: transient lines and tour steps share one bubble so they can
 * never overlap. `role="status"` + `aria-live="polite"` announces changes without
 * stealing focus, which matters because the pet talks unprompted.
 */
export function SpeechBubble(): ReactElement | null {
  const { speech, bubbleSide } = usePet();
  const guide = useGuide();
  const text = guide.active ? guide.message : (speech?.text ?? null);
  if (!text) return null;

  const steps = guide.active && !guide.pending;
  return (
    <div
      className="pl-pet-bubble"
      data-side={bubbleSide}
      data-guide={guide.active ? 'true' : undefined}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {steps ? (
        <p className="pl-pet-bubble__step">
          {guide.title} · {guide.stepIndex + 1} / {guide.stepCount}
        </p>
      ) : null}
      <p className="pl-pet-bubble__text">{text}</p>
      {guide.active ? (
        <div className="pl-pet-bubble__actions">
          {steps && guide.missing ? (
            <>
              <button type="button" className="pl-btn pl-btn--primary" onClick={guide.retry}>
                Retry
              </button>
              <button type="button" className="pl-btn" onClick={guide.skip}>
                Skip
              </button>
            </>
          ) : null}
          {steps && !guide.missing ? (
            <>
              {guide.canGoBack ? (
                <button type="button" className="pl-btn" onClick={guide.back}>
                  Back
                </button>
              ) : null}
              <button type="button" className="pl-btn pl-btn--primary" onClick={guide.next}>
                {guide.isLastStep ? 'Finish' : 'Next'}
              </button>
            </>
          ) : null}
          <button type="button" className="pl-btn pl-btn--quiet" onClick={guide.exit}>
            Exit
          </button>
        </div>
      ) : null}
      {guide.missing && guide.attempt > 0 ? (
        <p className="pl-pet-bubble__hint">Tried {guide.attempt + 1} times.</p>
      ) : null}
    </div>
  );
}
