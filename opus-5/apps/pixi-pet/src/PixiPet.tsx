import { useEffect, useRef, useState, type ReactElement } from 'react';
import { PetOverlay, usePet } from '@pet/react';
import type { PixiStage } from './pixiStage.js';

/**
 * Solution B's renderer: the shared pet chrome, with a PixiJS canvas behind it.
 *
 * The React side is deliberately tiny. It mounts a host element, lazily imports the PixiJS
 * stage, and then gets out of the way: after this effect runs, animation values only ever travel
 * through the mutable `runtime` object, never through React state, so a frame never re-renders
 * anything.
 *
 * The canvas is larger than the pet box (a hop, a stretch and a particle burst all reach past
 * the pet's footprint) and it takes no pointer events at all — the shared hit area inside
 * `PetOverlay` is the only pointer surface, which is what keeps the empty corners of the box
 * click-through for the page underneath.
 */

/** Canvas side in CSS pixels: small, fixed, centred on the pet box. */
const CANVAS_PX = { mobile: 240, tablet: 280, desktop: 300 } as const;

type Status = 'pending' | 'ready' | 'unsupported';

export function PixiPet(): ReactElement {
  const { runtime, engine, breakpoint, state } = usePet();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<PixiStage | null>(null);
  const [status, setStatus] = useState<Status>('pending');

  const canvasPx = CANVAS_PX[breakpoint];
  const canvasPxRef = useRef(canvasPx);
  const hidden = state.preferences.hidden;
  const hiddenRef = useRef(hidden);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let stage: PixiStage | null = null;

    // PixiJS is fetched only once a pet is actually mounted, so it never delays first paint.
    void import('./pixiStage.js')
      .then(async ({ createPixiStage }) => {
        if (disposed) return;
        stage = await createPixiStage({ host, canvasPx: canvasPxRef.current, runtime, engine });
        if (disposed || !stage) {
          stage?.destroy();
          // No WebGL: the page, the bubble, the tour and the controls all still work.
          if (!disposed && !stage) setStatus('unsupported');
          return;
        }
        stageRef.current = stage;
        stage.setRunning(!hiddenRef.current);
        setStatus('ready');
      })
      .catch(() => {
        if (!disposed) setStatus('unsupported');
      });

    return () => {
      disposed = true;
      stageRef.current = null;
      stage?.destroy();
    };
  }, [engine, runtime]);

  /** Crossing a breakpoint changes the canvas, not the pet: one resize, no rebuild. */
  useEffect(() => {
    canvasPxRef.current = canvasPx;
    stageRef.current?.resize(canvasPx);
  }, [canvasPx]);

  /** A hidden pet must cost nothing at all, so the ticker stops rather than idling. */
  useEffect(() => {
    hiddenRef.current = hidden;
    stageRef.current?.setRunning(!hidden);
  }, [hidden]);

  return (
    <PetOverlay
      behind={
        <div
          ref={hostRef}
          className="pl-pixi-host"
          data-testid="pixi-host"
          data-status={status}
          style={{ width: `${canvasPx}px`, height: `${canvasPx}px` }}
          aria-hidden="true"
        />
      }
    />
  );
}
