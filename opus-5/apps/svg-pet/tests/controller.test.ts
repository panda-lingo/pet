import { createPetRuntime, mulberry32, PoseEngine, STAGE_PARAMS, type PetRuntime } from '@pet/core';
import { describe, expect, it } from 'vitest';
import { createSvgAnimationController, type SvgAnimationController } from '../src/svgAnimationController.js';

/**
 * The animation controller is the whole of Solution A's per-frame cost, so it is tested on its
 * own: no React, no real `requestAnimationFrame`, one frame at a time.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

interface Harness {
  root: SVGSVGElement;
  runtime: PetRuntime;
  controller: SvgAnimationController;
  /** Runs the next queued animation frame at `time` ms. */
  tick(time: number): void;
  writes(): number;
  varOf(name: string): string;
}

function harness(overrides: Parameters<typeof createPetRuntime>[0] = {}): Harness {
  const root = document.createElementNS(SVG_NS, 'svg');
  // Only the two groups the controller looks up by class are needed here.
  root.innerHTML = '<g class="pl-panda__figure"></g><g class="pl-panda__effects"></g>';
  document.body.append(root);

  const runtime = createPetRuntime(overrides);
  const engine = new PoseEngine(runtime, { rng: mulberry32(0x51de) });

  let queued: ((time: number) => void) | null = null;
  let writes = 0;
  const setProperty = root.style.setProperty.bind(root.style);
  root.style.setProperty = (name: string, value: string | null, priority?: string): void => {
    writes += 1;
    setProperty(name, value, priority);
  };

  const controller = createSvgAnimationController({
    root,
    runtime,
    engine,
    raf: (callback) => {
      queued = callback;
      return 1;
    },
    caf: () => {
      queued = null;
    },
  });

  return {
    root,
    runtime,
    controller,
    tick(time) {
      const callback = queued;
      queued = null;
      callback?.(time);
    },
    writes: () => writes,
    varOf: (name) => root.style.getPropertyValue(name),
  };
}
describe('svg animation controller', () => {
  it('paints a posed first frame, with the pivots the stylesheet needs', () => {
    const h = harness();
    h.controller.start();

    // Pivots: written once, so a rotation can never be resolved against a default origin.
    expect(h.varOf('--o-head-x')).toBe('50px');
    expect(h.varOf('--o-head-y')).toBe('52px');
    expect(h.varOf('--o-figure-y')).toBe('93px');

    // Pose: the neutral frame, not an empty one.
    expect(h.varOf('--p-eye-open')).toBe('1.000');
    expect(h.varOf('--p-root-scale')).toBe('1.000');
    expect(h.varOf('--p-facing')).toBe('1');
    expect(h.varOf('--p-shadow-alpha')).not.toBe('');
  });

  it('writes the life-stage proportions, and the markings only when the stage has them', () => {
    const baby = harness({ stage: 'baby' });
    baby.controller.start();
    expect(baby.varOf('--s-head')).toBe(STAGE_PARAMS.baby.headScale.toFixed(3));
    expect(baby.varOf('--p-cheek')).toBe('0.000');

    const adult = harness({ stage: 'adult' });
    adult.controller.start();
    expect(adult.varOf('--s-head')).toBe(STAGE_PARAMS.adult.headScale.toFixed(3));
    expect(adult.varOf('--p-cheek')).toBe('0.420');
    expect(Number(adult.varOf('--s-head'))).toBeLessThan(Number(baby.varOf('--s-head')));
  });

  it('costs no DOM work per frame once a reduced-motion pose has been painted', () => {
    const h = harness({ motion: 'still' });
    h.controller.start();
    const baseline = h.writes();
    expect(baseline).toBeGreaterThan(0);

    h.tick(100);
    h.tick(200);
    h.tick(300);
    // Identical numbers every frame: the diff drops all of them.
    expect(h.writes()).toBe(baseline);
    expect(h.varOf('--p-root-rot')).toBe('0.000');
    expect(h.varOf('--p-body-sy')).toBe('1.000');
  });

  it('holds the last frame while paused and drops the reactions queued meanwhile', () => {
    const h = harness({ paused: true });
    h.controller.start();
    const baseline = h.writes();

    h.runtime.trigger('blink');
    h.tick(100);
    h.tick(500);
    expect(h.writes()).toBe(baseline);

    h.runtime.set({ paused: false });
    h.tick(900);
    expect(h.writes()).toBeGreaterThan(baseline);
    // The blink was drained during the pause, so resuming does not replay it.
    expect(h.varOf('--p-eye-open')).toBe('1.000');
  });

  it('stops animating an invisible pet', () => {
    const h = harness({ visible: false });
    h.controller.start();
    const baseline = h.writes();
    h.tick(100);
    h.tick(400);
    expect(h.writes()).toBe(baseline);

    h.runtime.set({ visible: true });
    h.tick(800);
    expect(h.writes()).toBeGreaterThan(baseline);
  });

  it('honours the target frame rate', () => {
    const h = harness({ targetFps: 30 });
    h.controller.start();
    h.tick(100);
    const baseline = h.writes();

    h.tick(110); // 10ms — inside the 30fps budget, so no frame is produced
    expect(h.writes()).toBe(baseline);

    h.tick(150); // 40ms — a frame lands
    expect(h.writes()).toBeGreaterThan(baseline);
  });

  it('closes the eyes at the middle of a blink', () => {
    const h = harness();
    h.controller.start();
    h.runtime.trigger('blink');
    // The blink envelope is 190ms, so 95ms is its peak: sin(π/2) = 1.
    h.controller.renderOnce(95);
    expect(h.varOf('--p-eye-open')).toBe('0.020');

    h.controller.renderOnce(190);
    expect(h.varOf('--p-eye-open')).toBe('1.000');
  });

  it('stops cleanly and takes its particles with it', () => {
    const h = harness({ motion: 'full' });
    h.controller.start();
    h.controller.stop();
    // No WAAPI in jsdom, so the burst is skipped rather than left as a static blob.
    expect(h.root.querySelectorAll('.pl-panda__particle')).toHaveLength(0);
    h.tick(100);
    expect(h.varOf('--p-eye-open')).toBe('1.000');
  });
});

