import { Application } from 'pixi.js';
import type { PetRuntime, PoseEngine } from '@pet/core';
import { buildPanda, type PandaScene } from './buildPanda.js';
import { createParticleLayer } from './particles.js';
import { createPixiAnimationController, type PixiAnimationController } from './petAnimationController.js';

/**
 * The PixiJS host for Solution B: one `Application`, one scene, one ticker callback.
 *
 * Everything the brief asks of the renderer lives here rather than in React:
 *
 * - one transparent `Application`, `autoDensity`, device resolution capped at 2
 * - the ticker is the only clock; React never re-renders because of a frame
 * - `maxFPS` follows the runtime's 30/60 setting, so low-power mode is one number
 * - the ticker is stopped while the document is hidden and while the pet is hidden, so a
 *   background tab costs nothing at all
 * - `destroy()` removes every listener it added and takes the canvas out of the DOM
 *
 * This module is the lazy chunk boundary: it is the only file that imports `pixi.js` at the top
 * level, so `import('./pixiStage.js')` is what pulls PixiJS into the page — never on first paint.
 */

export interface PixiStageOptions {
  /** The element the canvas is appended to. */
  host: HTMLElement;
  /** Side of the square canvas in CSS pixels. */
  canvasPx: number;
  runtime: PetRuntime;
  engine: PoseEngine;
  /** Off in jsdom, where baking a gradient texture needs a 2D canvas context. */
  gradients?: boolean;
  /** The state gallery wants one deterministic frame, not a running ticker. */
  autoRun?: boolean;
}

export interface PixiStage {
  scene: PandaScene;
  controller: PixiAnimationController;
  /** Draws the current transforms once. Used after `controller.renderOnce()`. */
  render(): void;
  /** Starts or stops the ticker; the pet being hidden must cost nothing. */
  setRunning(running: boolean): void;
  resize(canvasPx: number): void;
  destroy(): void;
}

/**
 * Resolves to `null` when WebGL is unavailable (a very old browser, a blocked context, jsdom).
 * The caller keeps the page, the bubbles and the controls working without a canvas.
 */
export async function createPixiStage(options: PixiStageOptions): Promise<PixiStage | null> {
  const { host, runtime, engine } = options;
  let canvasPx = options.canvasPx;
  const app = new Application();
  try {
    await app.init({
      width: canvasPx,
      height: canvasPx,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      // Retina is worth one extra pixel of density, never three.
      resolution: Math.min(globalThis.devicePixelRatio || 1, 2),
      powerPreference: 'low-power',
      autoStart: false,
    });
  } catch {
    try {
      app.destroy(true);
    } catch {
      // Nothing usable was built; there is nothing to clean up either.
    }
    return null;
  }

  // The canvas never takes pointer events: the DOM hit area over the pet does that, so empty
  // corners of the pet box cannot swallow a click meant for the page underneath.
  app.canvas.style.pointerEvents = 'none';
  app.canvas.style.display = 'block';
  host.append(app.canvas);

  const scene = buildPanda({ gradients: options.gradients ?? true });
  app.stage.addChild(scene.world);
  const controller = createPixiAnimationController({
    scene,
    runtime,
    engine,
    canvasPx,
    particles: createParticleLayer(scene.effects),
  });

  // The gallery asks for a stopped stage so its one frame stays deterministic.
  let wanted = options.autoRun ?? true;
  let fps = runtime.state.targetFps;
  app.ticker.maxFPS = fps;

  function tick(): void {
    // The one clock. `deltaMS` is real elapsed time, so motion is frame-rate independent.
    if (fps !== runtime.state.targetFps) {
      fps = runtime.state.targetFps;
      app.ticker.maxFPS = fps;
    }
    controller.tick(app.ticker.deltaMS);
  }
  app.ticker.add(tick);

  function sync(): void {
    const hidden = typeof document !== 'undefined' && document.hidden;
    if (wanted && !hidden) app.start();
    else app.stop();
  }

  const onVisibility = (): void => sync();
  document.addEventListener('visibilitychange', onVisibility);

  // Mounting must never show an unposed panda: paint the neutral pose before the ticker runs.
  controller.renderOnce(0);
  app.render();
  sync();

  return {
    scene,
    controller,
    render(): void {
      app.render();
    },
    setRunning(running: boolean): void {
      wanted = running;
      sync();
    },
    resize(next: number): void {
      if (next === canvasPx) return;
      canvasPx = next;
      app.renderer.resize(next, next);
      controller.resize(next);
      controller.renderOnce(0);
      app.render();
    },
    destroy(): void {
      document.removeEventListener('visibilitychange', onVisibility);
      app.ticker.remove(tick);
      controller.destroy();
      scene.destroy();
      // `children: true` frees this scene's containers; the shared geometry and gradients were
      // handed in from the cache, so PixiJS leaves them for the next pet to use.
      app.destroy({ removeView: true }, { children: true });
    },
  };
}
