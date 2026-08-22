import { useEffect, useRef, type ReactElement } from 'react';
import {
  createPetRuntime,
  mulberry32,
  PoseEngine,
  type LifeStage,
  type MotionProfile,
  type Mood,
  type PetPose,
} from '@pet/core';
import type { PixiStage } from './pixiStage.js';

/**
 * Development state gallery (`#gallery`) — Solution B's copy of Solution A's review page, so the
 * same eleven frames can be compared side by side between the two renderers.
 *
 * Every cell owns a private runtime, pose engine and PixiJS stage, and is drawn with a fixed
 * number of fixed-size steps through `renderOnce` followed by a single `render()`. A cell is one
 * deterministic frame — the same frame on every load, which is what makes it useful for
 * screenshots and review — so each stage is created with `autoRun: false` and its ticker never
 * starts.
 *
 * Most cells use the `still` profile: with amplitude 0 the engine returns its static frame,
 * which still applies mood and held poses. The two cells that need motion (`eyes closed`
 * mid-blink, `walking` mid-stride) say so and step just far enough to get there.
 *
 * Fourteen cells means fourteen WebGL contexts on this one route, which sits inside the browser
 * limit (~16) only because the gallery replaces the site and never mounts the live pet. It is a
 * review page, not a shipping pattern; the real page has exactly one context.
 */

interface GalleryState {
  id: string;
  title: string;
  note: string;
  mood: Mood;
  stage?: LifeStage;
  pose?: PetPose;
  motion?: MotionProfile;
  /** Queues a blink before the first frame is drawn. */
  blink?: boolean;
  /** Frame deltas in ms; the default is a single zero-length frame. */
  frames?: readonly number[];
}
const STATES: readonly GalleryState[] = [
  { id: 'baby-neutral', title: 'Baby · neutral', note: 'Bigger head, shorter legs, no markings.', mood: 'neutral', stage: 'baby' },
  { id: 'young-happy', title: 'Young · happy', note: 'Markings arrive; the smile is still quiet.', mood: 'happy', stage: 'young' },
  { id: 'adult-neutral', title: 'Adult · neutral', note: 'The reference proportions.', mood: 'neutral' },
  { id: 'curious', title: 'Adult · curious', note: 'Head tilt, one brow raised, ears forward.', mood: 'curious' },
  { id: 'tired', title: 'Adult · tired', note: 'Lidded eyes, dropped ears, lowered body.', mood: 'tired' },
  { id: 'hungry', title: 'Adult · hungry', note: 'Open mouth, brows pulled in.', mood: 'hungry' },
  { id: 'lonely', title: 'Adult · lonely', note: 'Downturned mouth, ears out, gaze low.', mood: 'lonely' },
  { id: 'excited', title: 'Adult · excited', note: 'Wide eyes, raised brows, lifted ears.', mood: 'excited' },
  {
    id: 'eyes-closed',
    title: 'Adult · eyes closed',
    note: 'Mid-blink, 95ms into a 190ms blink.',
    mood: 'neutral',
    motion: 'full',
    blink: true,
    frames: [95],
  },
  { id: 'pointing', title: 'Adult · pointing', note: 'Guide pose: right paw up, head turned in.', mood: 'happy', pose: 'point' },
  {
    id: 'walking',
    title: 'Adult · walking',
    note: 'Two 64ms steps into the gait, legs near full swing.',
    mood: 'neutral',
    pose: 'walk',
    motion: 'full',
    frames: [64, 64],
  },
];

/** Sizes the brief asks the artwork to stay readable at. */
const SIZE_CHECK: readonly number[] = [120, 180, 240];

/** One shared descriptor for the size row: each cell still builds its own engine. */
const SIZE_STATE: GalleryState = { id: 'size', title: '', note: '', mood: 'happy' };
function GalleryPanda({ state, size }: { state: GalleryState; size: number }): ReactElement {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let stage: PixiStage | null = null;

    void import('./pixiStage.js').then(async ({ createPixiStage }) => {
      if (disposed) return;
      // `sizePx === canvasPx` puts the pet box exactly on the cell, so the figure fills it.
      const runtime = createPetRuntime({
        mood: state.mood,
        stage: state.stage ?? 'adult',
        pose: state.pose ?? 'stand',
        motion: state.motion ?? 'still',
        sizePx: size,
      });
      const engine = new PoseEngine(runtime, { rng: mulberry32(0x9a11) });
      stage = await createPixiStage({ host, canvasPx: size, runtime, engine, autoRun: false });
      if (disposed || !stage) {
        stage?.destroy();
        return;
      }
      if (state.blink) runtime.trigger('blink');
      for (const dt of state.frames ?? [0]) stage.controller.renderOnce(dt);
      stage.render();
    });

    return () => {
      disposed = true;
      stage?.destroy();
    };
  }, [state, size]);

  return (
    <div
      className="pl-gallery__stage"
      ref={hostRef}
      style={{ width: `${size}px`, height: `${size}px` }}
      aria-hidden="true"
    />
  );
}
export function Gallery(): ReactElement {
  return (
    <main className="pl-gallery" id="pl-main">
      <header className="pl-gallery__head">
        <p className="pl-eyebrow">Development gallery</p>
        <h1 className="pl-gallery__title">Panda states</h1>
        <p className="pl-lede">
          Eleven deterministic frames from the shared pose engine, drawn by the PixiJS renderer.
          Each cell is one static frame on its own stopped stage, not a running animation.
        </p>
        <a className="pl-cta pl-cta--ghost" href="#home">
          Back to the site
        </a>
      </header>

      <ul className="pl-gallery__grid">
        {STATES.map((state) => (
          <li className="pl-gallery__cell" key={state.id}>
            <GalleryPanda state={state} size={168} />
            <h2 className="pl-gallery__label">{state.title}</h2>
            <p className="pl-gallery__note">{state.note}</p>
          </li>
        ))}
      </ul>

      <section className="pl-gallery__sizes" aria-labelledby="pl-gallery-sizes">
        <h2 className="pl-gallery__label" id="pl-gallery-sizes">
          Readable from 120 to 240 pixels
        </h2>
        <div className="pl-gallery__row">
          {SIZE_CHECK.map((size) => (
            <div className="pl-gallery__sizeCell" key={size}>
              <GalleryPanda state={SIZE_STATE} size={size} />
              <p className="pl-gallery__note">{size}px</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
