import {
  brandDuration,
  brandEasing,
  pandaColor,
  type PetRuntime,
  type PoseEngine,
  type PoseSnapshot,
} from '@pet/core';
import { pivotVariables } from './geometry.js';

/**
 * The one animation controller for Solution A.
 *
 * It owns no character logic: the shared `PoseEngine` produces a pose, and this file's only
 * job is to get 30 numbers onto the DOM as cheaply as possible.
 *
 * - looping motion is CSS transforms driven by custom properties, written here once per frame
 * - one-shot *particle* bursts use the Web Animations API (see `spawn`)
 * - `requestAnimationFrame` drives pointer tracking and active movement only
 * - React never re-renders because of anything in here
 *
 * Writes are diffed against the previous frame, so a still pose (reduced motion) costs no DOM
 * work at all after the first frame.
 */

const POSE_VARS: readonly (readonly [string, keyof PoseSnapshot])[] = [
  ['--p-root-x', 'rootX'],
  ['--p-root-y', 'rootY'],
  ['--p-root-rot', 'rootRot'],
  ['--p-root-scale', 'rootScale'],
  ['--p-body-sx', 'bodyScaleX'],
  ['--p-body-sy', 'bodyScaleY'],
  ['--p-body-y', 'bodyY'],
  ['--p-body-rot', 'bodyRot'],
  ['--p-head-x', 'headX'],
  ['--p-head-y', 'headY'],
  ['--p-head-rot', 'headRot'],
  ['--p-ear-l', 'earLeftRot'],
  ['--p-ear-r', 'earRightRot'],
  ['--p-eye-open', 'eyeOpen'],
  ['--p-pupil-x', 'pupilX'],
  ['--p-pupil-y', 'pupilY'],
  ['--p-brow-y', 'browY'],
  ['--p-brow-angle', 'browAngle'],
  ['--p-mouth-open', 'mouthOpen'],
  ['--p-mouth-curve', 'mouthCurve'],
  ['--p-arm-l', 'armLeftRot'],
  ['--p-arm-r', 'armRightRot'],
  ['--p-leg-f', 'legFrontRot'],
  ['--p-leg-b', 'legBackRot'],
  ['--p-tail', 'tailRot'],
  ['--p-shadow-scale', 'shadowScale'],
  ['--p-shadow-alpha', 'shadowAlpha'],
  ['--p-scarf', 'scarfSway'],
];
export interface SvgAnimationOptions {
  /** The `<svg>` element every custom property is written to. */
  root: SVGSVGElement;
  runtime: PetRuntime;
  engine: PoseEngine;
  /** Injected in tests; defaults to `requestAnimationFrame`. */
  raf?: (callback: (time: number) => void) => number;
  caf?: (handle: number) => void;
}

export interface SvgAnimationController {
  start(): void;
  stop(): void;
  /**
   * Advances the pose by `dtMs` and writes exactly one frame.
   *
   * This is the seam the state gallery and the jsdom tests use, so neither needs a running
   * `requestAnimationFrame` loop to produce a deterministic pose.
   */
  renderOnce(dtMs?: number): void;
}

export function createSvgAnimationController(options: SvgAnimationOptions): SvgAnimationController {
  const { root, runtime, engine } = options;
  const raf = options.raf ?? ((cb) => requestAnimationFrame(cb));
  const caf = options.caf ?? ((handle) => cancelAnimationFrame(handle));

  /** Last value written for each custom property, so a still pose stops touching the DOM. */
  const written = new Map<string, string>();
  let handle: number | null = null;
  let lastTime = 0;
  let started = false;

  function set(name: string, value: string): void {
    if (written.get(name) === value) return;
    written.set(name, value);
    root.style.setProperty(name, value);
  }

  /** Three decimals is below a device pixel at every size the pet is used at. */
  function num(name: string, value: number): void {
    set(name, value.toFixed(3));
  }
  /**
   * One frame of DOM work: 28 pose numbers, the derived cheek opacity, facing, and the
   * life-stage proportions. Every one of them is diffed, so a static pose writes nothing.
   */
  function write(pose: PoseSnapshot): void {
    stageCrossfade();
    for (const [name, key] of POSE_VARS) num(name, pose[key]);

    const state = runtime.state;
    const stage = state.stageParams;
    // Cheek markings are a life-stage feature; blush is a mood. One opacity carries both, so
    // a blushing baby still shows colour on the cheeks it does not yet have markings on.
    num('--p-cheek', Math.max(stage.showMarkings ? 0.42 : 0, pose.blush));
    set('--p-facing', String(state.facing));
    num('--s-head', stage.headScale);
    num('--s-body', stage.bodyScale);
    num('--s-eye', stage.eyeScale);
    num('--s-ear', stage.earScale);
    num('--s-leg', stage.legLength);
    num('--s-tail', stage.tailLength);
    num('--s-overall', stage.overallScale);

    particles(pose);
  }
  /*
   * Particles are the only thing here that is *not* a per-frame write: each burst is a handful
   * of nodes handed to the Web Animations API and removed when it finishes. `pose.heart` and
   * `pose.sparkle` are bell curves, so a burst is spawned on their rising edge — once per
   * reaction, never per frame.
   */
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const EFFECT_LIMIT = 10;
  const EDGE = 0.2;
  const SHAPE = {
    heart: 'M0 2.4C-2.9 0.3-2.9-2.6-1-2.6-0.2-2.6 0-2 0-1.6 0-2 0.2-2.6 1-2.6 2.9-2.6 2.9 0.3 0 2.4Z',
    sparkle: 'M0-2.6L0.7-0.7L2.6 0L0.7 0.7L0 2.6L-0.7 0.7L-2.6 0L-0.7-0.7Z',
  } as const;
  const live = new Set<SVGPathElement>();
  let lastHeart = 0;
  let lastSparkle = 0;

  function spawn(kind: 'heart' | 'sparkle', index: number, count: number): void {
    const layer = root.querySelector('.pl-panda__effects');
    if (!layer) return;
    const node = document.createElementNS(SVG_NS, 'path');
    // No WAAPI (jsdom, very old browsers): draw nothing rather than leave a static blob.
    if (typeof node.animate !== 'function') return;
    if (live.size >= EFFECT_LIMIT) return;

    node.setAttribute('class', `pl-panda__particle pl-panda__particle--${kind}`);
    node.setAttribute('d', SHAPE[kind]);
    node.setAttribute('fill', kind === 'heart' ? pandaColor.scarf : pandaColor.coat);
    node.style.opacity = '0';

    // Fan the burst out around the top of the head, biased to the side the pet faces.
    const spread = (index - (count - 1) / 2) * 7;
    const x0 = 50 + spread * 0.6 + runtime.state.facing * 4;
    const y0 = 16 - Math.abs(spread) * 0.3;
    const rise = kind === 'heart' ? 16 : 9;
    const drift = spread * 0.5;
    node.style.transform = `translate(${x0.toFixed(2)}px, ${y0.toFixed(2)}px) scale(0.4)`;
    layer.append(node);
    live.add(node);

    const animation = node.animate(
      [
        { transform: `translate(${x0.toFixed(2)}px, ${y0.toFixed(2)}px) scale(0.4)`, opacity: 0 },
        { transform: `translate(${(x0 + drift * 0.4).toFixed(2)}px, ${(y0 - rise * 0.35).toFixed(2)}px) scale(1)`, opacity: 0.92, offset: 0.32 },
        { transform: `translate(${(x0 + drift).toFixed(2)}px, ${(y0 - rise).toFixed(2)}px) scale(0.7)`, opacity: 0 },
      ],
      { duration: kind === 'heart' ? 1_200 : 900, easing: brandEasing, delay: index * 110 },
    );
    animation.onfinish = () => {
      live.delete(node);
      node.remove();
    };
  }
  function particles(pose: PoseSnapshot): void {
    if (!runtime.state.capabilities.particles) {
      lastHeart = pose.heart;
      lastSparkle = pose.sparkle;
      return;
    }
    if (pose.heart > EDGE && lastHeart <= EDGE) for (let i = 0; i < 3; i += 1) spawn('heart', i, 3);
    if (pose.sparkle > EDGE && lastSparkle <= EDGE) for (let i = 0; i < 5; i += 1) spawn('sparkle', i, 5);
    lastHeart = pose.heart;
    lastSparkle = pose.sparkle;
  }

  function clearParticles(): void {
    for (const node of live) node.remove();
    live.clear();
  }

  /** rAF budget for the current target frame rate, with a little slack for jitter. */
  function frameInterval(): number {
    return 1000 / runtime.state.targetFps - 2;
  }

  function frame(time: number): void {
    handle = raf(frame);
    if (lastTime === 0) {
      lastTime = time;
      return;
    }
    const dt = time - lastTime;
    if (dt < frameInterval()) return;
    lastTime = time;

    if (typeof document !== 'undefined' && document.hidden) return;
    const state = runtime.state;
    if (!state.visible) return;
    // A paused pet holds its last frame. Reactions queued meanwhile are dropped rather than
    // replayed all at once when it resumes.
    if (state.paused) {
      runtime.takeReactions();
      return;
    }
    write(engine.update(dt));
  }
  /**
   * A stage change swaps several proportions at once, which would otherwise pop. One short
   * opacity fade covers it — the brand's motion vocabulary is opacity, translateY and a small
   * scale, and the pose transform is already busy, so opacity is the honest choice here.
   */
  let lastStage = runtime.state.stage;
  function stageCrossfade(): void {
    const state = runtime.state;
    if (state.stage === lastStage) return;
    lastStage = state.stage;
    const figure = root.querySelector('.pl-panda__figure');
    if (!figure || state.capabilities.amplitude === 0 || typeof figure.animate !== 'function') return;
    figure.animate([{ opacity: 0.55 }, { opacity: 1 }], {
      duration: brandDuration.slow,
      easing: brandEasing,
    });
  }

  return {
    start(): void {
      if (started) return;
      started = true;
      // Pivots are constant, so they are written once rather than every frame.
      for (const [name, value] of Object.entries(pivotVariables())) set(name, value);
      lastStage = runtime.state.stage;
      // Paint the first frame immediately: mounting must never show an unposed panda.
      write(engine.update(0));
      lastTime = 0;
      handle = raf(frame);
    },
    stop(): void {
      started = false;
      if (handle !== null) caf(handle);
      handle = null;
      clearParticles();
    },
    renderOnce(dtMs = 0): void {
      write(engine.update(dtMs));
    },
  };
}
