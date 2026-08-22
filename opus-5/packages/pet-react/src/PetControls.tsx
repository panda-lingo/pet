import { useEffect, useRef, useState, type ReactElement } from 'react';
import { petEdgeGap, petFootprint, petZIndex, type MotionProfile } from '@pet/core';
import { usePet } from './context.js';

const MOTION_CHOICES: readonly { value: MotionProfile | null; label: string }[] = [
  { value: null, label: 'System' },
  { value: 'still', label: 'Still' },
  { value: 'calm', label: 'Calm' },
  { value: 'full', label: 'Full' },
];

/**
 * The pet's own controls: pause, mute, motion, hide, reset and the tours.
 *
 * Every toggle reports its state with `aria-pressed`, and hiding the pet leaves a small
 * pill behind so a keyboard user can always bring it back.
 */
export function PetControls(): ReactElement {
  const { state, motion, actions, tours, storageAvailable, breakpoint } = usePet();
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement | null>(null);

  // Anchored to the *dock* footprint, not the live one, so the button does not hop
  // sideways every time the pet grows into its companion size.
  const gap = breakpoint === 'mobile' ? petEdgeGap.mobile : petEdgeGap.desktop;
  const anchor = { right: `${gap}px`, zIndex: petZIndex + 1 };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!panel.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  if (state.preferences.hidden) {
    return (
      <button
        type="button"
        className="pl-pet-restore"
        style={{ ...anchor, bottom: `${gap}px` }}
        onClick={() => actions.setHidden(false)}
      >
        Bring Panda back
      </button>
    );
  }

  const { paused, muted, motionOverride } = state.preferences;
  return (
    <div
      className="pl-pet-controls"
      ref={panel}
      style={{ ...anchor, bottom: `${gap + petFootprint.dock[breakpoint] + 10}px` }}
    >
      <button
        type="button"
        className="pl-pet-controls__toggle"
        aria-label="Panda settings"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">•••</span>
      </button>
      {open ? (
        <div className="pl-pet-panel" role="group" aria-label="Panda settings">
          <div className="pl-pet-panel__row">
            <button
              type="button"
              className="pl-btn"
              aria-pressed={paused}
              onClick={() => actions.setPaused(!paused)}
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button type="button" className="pl-btn" aria-pressed={muted} onClick={() => actions.setMuted(!muted)}>
              {muted ? 'Unmute' : 'Mute'}
            </button>
          </div>

          <p className="pl-pet-panel__label" id="pl-motion-label">
            Motion
          </p>
          <div className="pl-pet-panel__row" role="group" aria-labelledby="pl-motion-label">
            {MOTION_CHOICES.map((choice) => (
              <button
                key={choice.label}
                type="button"
                className="pl-btn pl-btn--chip"
                aria-pressed={motionOverride === choice.value}
                onClick={() => actions.setMotionOverride(choice.value)}
              >
                {choice.label}
              </button>
            ))}
          </div>
          <p className="pl-pet-panel__hint">
            Now: {motion}
            {motionOverride === null ? ' (following your system setting)' : ''}
          </p>

          <p className="pl-pet-panel__label" id="pl-tours-label">
            Show me around
          </p>
          <div className="pl-pet-panel__row" role="group" aria-labelledby="pl-tours-label">
            {tours.map((tour) => (
              <button
                key={tour.id}
                type="button"
                className="pl-btn pl-btn--chip"
                onClick={() => {
                  setOpen(false);
                  actions.startTour(tour.id);
                }}
              >
                {tour.title}
                {state.completedTours.includes(tour.id) ? ' ✓' : ''}
              </button>
            ))}
          </div>

          <div className="pl-pet-panel__row pl-pet-panel__row--end">
            <button
              type="button"
              className="pl-btn pl-btn--quiet"
              onClick={() => {
                setOpen(false);
                actions.setHidden(true);
              }}
            >
              Hide
            </button>
            <button type="button" className="pl-btn pl-btn--quiet" onClick={() => actions.reset()}>
              Start over
            </button>
          </div>
          {storageAvailable ? null : (
            <p className="pl-pet-panel__hint">Storage is blocked, so this visit will not be remembered.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
