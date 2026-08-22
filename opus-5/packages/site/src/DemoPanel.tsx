import type { ReactElement } from 'react';
import { usePet } from '@pet/react';
import type { NeedKey, PetPose, ReactionKind } from '@pet/core';

/**
 * Review surface for the two demo apps.
 *
 * It is deliberately *not* part of `PandaLingoSite`: the host page stays unaware of the pet
 * apart from its `data-pet-target` anchors, and this panel is passed in as children by each
 * app. Everything here goes through the shared `PetActions`, so both renderers expose exactly
 * the same controls and neither app grows its own copy.
 */

const REACTIONS: readonly ReactionKind[] = [
  'nod',
  'bounce',
  'jump',
  'squash',
  'wave',
  'heart',
  'sparkle',
  'blink',
  'earTwitch',
  'stretch',
  'yawn',
  'lookAround',
];

const POSES: readonly PetPose[] = ['stand', 'sit', 'sleep', 'walk', 'point', 'wave', 'celebrate'];

const NEEDS: readonly { key: NeedKey; label: string }[] = [
  { key: 'energy', label: 'Energy' },
  { key: 'hunger', label: 'Hunger' },
  { key: 'affection', label: 'Affection' },
  { key: 'curiosity', label: 'Curiosity' },
  { key: 'trust', label: 'Trust' },
];
export interface DemoPanelProps {
  /** Which renderer is mounted, so a screenshot is self-describing. */
  renderer: string;
  /** Link to the state gallery route. */
  galleryHref?: string;
}

export function DemoPanel({ renderer, galleryHref = '#gallery' }: DemoPanelProps): ReactElement {
  const { state, motion, actions, tours, guideState, storageAvailable, size } = usePet();
  const percent = Math.round(state.stageProgress * 100);

  return (
    <section className="pl-demo" id="demo" aria-labelledby="pl-demo-title">
      <p className="pl-eyebrow">For review</p>
      <h2 className="pl-display pl-display--section" id="pl-demo-title">
        The pet, from the outside
      </h2>
      <p className="pl-lede">
        These controls exist for this demo only — the product ships the pet with its own quiet
        Pause, Hide and Reset buttons. {renderer} is drawing the panda in the corner.
      </p>

      <div className="pl-demo__grid">
        <article className="pl-demo__card">
          <h3 className="pl-demo__title">State</h3>
          <dl className="pl-demo__facts">
            <dt>Mood</dt>
            <dd data-testid="demo-mood">{state.mood}</dd>
            <dt>Stage</dt>
            <dd data-testid="demo-stage">
              {state.stage} · {percent}%
            </dd>
            <dt>XP</dt>
            <dd data-testid="demo-xp">{Math.round(state.xp)}</dd>
            <dt>Motion</dt>
            <dd data-testid="demo-motion">{motion}</dd>
            <dt>Pet box</dt>
            <dd>{size}px</dd>
            <dt>Storage</dt>
            <dd>{storageAvailable ? 'localStorage' : 'memory only'}</dd>
          </dl>
        </article>
        <article className="pl-demo__card">
          <h3 className="pl-demo__title">Needs</h3>
          <ul className="pl-demo__needs">
            {NEEDS.map(({ key, label }) => (
              <li key={key}>
                <span className="pl-demo__needLabel">
                  {label} <strong>{Math.round(state.needs[key])}</strong>
                </span>
                <span className="pl-demo__bar" aria-hidden="true">
                  <span className="pl-demo__barFill" style={{ width: `${Math.round(state.needs[key])}%` }} />
                </span>
              </li>
            ))}
          </ul>
          <p className="pl-demo__hint">Hunger counts up: 100 is starving.</p>
        </article>

        <article className="pl-demo__card">
          <h3 className="pl-demo__title">Reactions</h3>
          <div className="pl-demo__pills">
            {REACTIONS.map((kind) => (
              <button type="button" className="pl-demo__pill" key={kind} onClick={() => actions.trigger(kind)}>
                {kind}
              </button>
            ))}
          </div>
          <div className="pl-demo__pills">
            <button type="button" className="pl-demo__pill" onClick={() => actions.tap()}>
              tap the pet
            </button>
            <button type="button" className="pl-demo__pill" onClick={() => actions.petted(1)}>
              pet once
            </button>
            <button type="button" className="pl-demo__pill" onClick={() => actions.say('Small steps. Big progress.')}>
              say a line
            </button>
          </div>
        </article>
        <article className="pl-demo__card">
          <h3 className="pl-demo__title">Held pose</h3>
          <div className="pl-demo__pills">
            {POSES.map((pose) => (
              <button type="button" className="pl-demo__pill" key={pose} onClick={() => actions.setPose(pose)}>
                {pose}
              </button>
            ))}
          </div>
          <p className="pl-demo__hint">
            A tour or an idle action may take the pose back — the pet keeps living while you look.
          </p>
        </article>

        <article className="pl-demo__card">
          <h3 className="pl-demo__title">Guided tours</h3>
          <div className="pl-demo__pills">
            {tours.map((tour) => (
              <button
                type="button"
                className="pl-demo__pill"
                key={tour.id}
                data-testid={`demo-tour-${tour.id}`}
                onClick={() => actions.startTour(tour.id)}
              >
                {tour.title}
              </button>
            ))}
          </div>
          <p className="pl-demo__hint" data-testid="demo-guide">
            {guideState.active
              ? `Step ${guideState.stepIndex + 1} of ${guideState.stepCount} · ${guideState.status}`
              : `Idle · ${state.completedTours.length} finished`}
          </p>
          <div className="pl-demo__pills">
            <button type="button" className="pl-demo__pill" onClick={() => void actions.returnToDock()}>
              return to dock
            </button>
            <a className="pl-demo__pill" href={galleryHref}>
              state gallery
            </a>
          </div>
        </article>
      </div>
    </section>
  );
}
