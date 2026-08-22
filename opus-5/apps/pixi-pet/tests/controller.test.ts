import { ObservablePoint } from 'pixi.js';
import {
  createPetRuntime,
  mulberry32,
  PoseEngine,
  STAGE_PARAMS,
  VIEW,
  type PetRuntime,
} from '@pet/core';
import { describe, expect, it } from 'vitest';
import { buildPanda, type PandaScene } from '../src/buildPanda.js';
import { createParticleLayer } from '../src/particles.js';
import { createPixiAnimationController, type PixiAnimationController } from '../src/petAnimationController.js';

/**
 * Solution B's per-frame cost is the controller writing container transforms, so it is tested
 * without a renderer: no `Application`, no WebGL, no ticker. `buildPanda({ gradients: false })`
 * keeps the scene inside jsdom's reach — baking a gradient needs a 2D canvas — and every
 * assertion below is about the numbers on the containers.
 */

const CANVAS = 240;
const SIZE = 148;

interface Harness {
  scene: PandaScene;
  runtime: PetRuntime;
  controller: PixiAnimationController;
}

function harness(overrides: Parameters<typeof createPetRuntime>[0] = {}, particles = false): Harness {
  const scene = buildPanda({ gradients: false });
  const runtime = createPetRuntime({ sizePx: SIZE, ...overrides });
  const engine = new PoseEngine(runtime, { rng: mulberry32(0x51de) });
  const controller = createPixiAnimationController({
    scene,
    runtime,
    engine,
    canvasPx: CANVAS,
    particles: particles ? createParticleLayer(scene.effects) : null,
  });
  return { scene, runtime, controller };
}

/**
 * Counts the transform writes `body` actually performs. `setPos`/`setScale` skip the call when
 * the number has not changed, so this is the honest measure of per-frame work.
 */
function countWrites(body: () => void): number {
  const original = ObservablePoint.prototype.set;
  let writes = 0;
  ObservablePoint.prototype.set = function counted(this: ObservablePoint, x?: number, y?: number) {
    writes += 1;
    return original.call(this, x, y);
  };
  try {
    body();
  } finally {
    ObservablePoint.prototype.set = original;
  }
  return writes;
}
describe('pixi scene graph', () => {
  it('puts every joint on its documented pivot, as both pivot and position', () => {
    const scene = buildPanda({ gradients: false });
    // `pivot === position` is what makes the Pixi rig agree with Solution A's CSS transforms.
    expect([scene.head.pivot.x, scene.head.pivot.y]).toEqual([50, 52]);
    expect([scene.head.position.x, scene.head.position.y]).toEqual([50, 52]);
    expect([scene.root.pivot.x, scene.root.pivot.y]).toEqual([50, 93]);
    expect([scene.earLeft.pivot.x, scene.earLeft.pivot.y]).toEqual([33, 18]);
    expect([scene.tail.pivot.x, scene.tail.pivot.y]).toEqual([29, 74]);
    scene.destroy();
  });

  it('nests the figure so squash never reaches the face, and keeps the shared contexts alive', () => {
    const first = buildPanda({ gradients: false });
    // The head is a sibling of the torso; the limbs and scarf ride inside it.
    expect(first.root.children).toContain(first.head);
    expect(first.root.children).toContain(first.body);
    expect(first.body.children).toContain(first.frontLegs);
    expect(first.head.children).toContain(first.muzzle);
    const headParts = first.head.children.length;

    first.destroy();
    expect(first.world.destroyed).toBe(true);

    // Geometry is cached per page: a second scene reuses the same contexts the first one used.
    const second = buildPanda({ gradients: false });
    expect(second.head.children).toHaveLength(headParts);
    expect(second.world.destroyed).toBe(false);
    second.destroy();
  });
});
describe('pixi animation controller', () => {
  it('poses a first frame, centred in the canvas and scaled to the pet box', () => {
    const h = harness();
    h.controller.renderOnce(0);

    // The pet box is centred in the oversized canvas, so a hop has room and never clips.
    const inset = (CANVAS - SIZE) / 2;
    expect([h.scene.world.position.x, h.scene.world.position.y]).toEqual([inset, inset]);
    expect(h.scene.world.scale.x).toBeCloseTo(SIZE / VIEW, 6);

    // A posed frame, not an empty one.
    expect(h.scene.root.position.y).toBeCloseTo(h.scene.root.pivot.y, 6);
    expect(h.scene.lidLeft.scale.y).toBe(1);
    expect(h.scene.shadow.alpha).toBeGreaterThan(0);
    expect(h.scene.root.scale.x).toBeGreaterThan(0);
    h.scene.destroy();
  });

  it('writes the life-stage proportions, and the markings only when the stage has them', () => {
    const baby = harness({ stage: 'baby' });
    baby.controller.renderOnce(0);
    expect(baby.scene.head.scale.x).toBeCloseTo(STAGE_PARAMS.baby.headScale, 6);
    expect(baby.scene.cheeks.alpha).toBe(0);

    const adult = harness({ stage: 'adult' });
    adult.controller.renderOnce(0);
    expect(adult.scene.head.scale.x).toBeCloseTo(STAGE_PARAMS.adult.headScale, 6);
    expect(adult.scene.cheeks.alpha).toBeCloseTo(0.42, 6);
    expect(adult.scene.head.scale.x).toBeLessThan(baby.scene.head.scale.x);
    expect(adult.scene.legLeft.scale.y).toBeGreaterThan(baby.scene.legLeft.scale.y);
    baby.scene.destroy();
    adult.scene.destroy();
  });

  it('costs no transform writes per frame once a reduced-motion pose has been drawn', () => {
    const h = harness({ motion: 'still' });
    const first = countWrites(() => h.controller.renderOnce(0));
    expect(first).toBeGreaterThan(0);

    // Identical numbers every frame: the diff drops all of them.
    const later = countWrites(() => {
      h.controller.tick(16);
      h.controller.tick(16);
      h.controller.tick(16);
    });
    expect(later).toBe(0);
    expect(h.scene.root.rotation).toBe(0);
    expect(h.scene.body.scale.y).toBeCloseTo(STAGE_PARAMS.adult.bodyScale, 6);
    h.scene.destroy();
  });
});
describe('pixi controller gating', () => {
  it('holds the last frame while paused and drops the reactions queued meanwhile', () => {
    const h = harness({ paused: true });
    h.controller.renderOnce(0);

    h.runtime.trigger('blink');
    const paused = countWrites(() => {
      expect(h.controller.tick(100)).toBe(false);
      expect(h.controller.tick(400)).toBe(false);
    });
    expect(paused).toBe(0);

    h.runtime.set({ paused: false });
    expect(h.controller.tick(95)).toBe(true);
    // The blink was drained during the pause, so resuming does not replay it.
    expect(h.scene.lidLeft.scale.y).toBe(1);
    h.scene.destroy();
  });

  it('draws nothing at all for a hidden pet', () => {
    const h = harness({ visible: false });
    h.controller.renderOnce(0);
    const hidden = countWrites(() => {
      expect(h.controller.tick(100)).toBe(false);
      expect(h.controller.tick(400)).toBe(false);
    });
    expect(hidden).toBe(0);

    h.runtime.set({ visible: true });
    expect(h.controller.tick(120)).toBe(true);
    h.scene.destroy();
  });

  it('closes the eyes at the middle of a blink and opens them again', () => {
    const h = harness();
    h.controller.renderOnce(0);
    h.runtime.trigger('blink');
    // The blink envelope is 190ms, so 95ms is its peak: sin(π/2) = 1.
    h.controller.renderOnce(95);
    expect(h.scene.lidLeft.scale.y).toBeCloseTo(0.02, 3);
    // The lashes are the closed-eye line, so they fade in as the lid comes down.
    expect(h.scene.lashLeft.alpha).toBeCloseTo(0.98, 3);

    h.controller.renderOnce(95);
    expect(h.scene.lidLeft.scale.y).toBe(1);
    expect(h.scene.lashLeft.alpha).toBe(0);
    h.scene.destroy();
  });
});
describe('pixi particles', () => {
  /** Live particles are the visible ones: the pool itself is built once and never grows. */
  function visible(scene: PandaScene): number {
    return scene.effects.children.filter((child) => child.visible).length;
  }

  it('spawns one capped burst per reaction and pools every particle', () => {
    const h = harness({ motion: 'full' }, true);
    h.controller.renderOnce(0);
    const pooled = h.scene.effects.children.length;
    expect(pooled).toBe(10);
    expect(visible(h.scene)).toBe(0);

    h.runtime.trigger('heart');
    for (let i = 0; i < 6; i += 1) h.controller.renderOnce(60);
    expect(visible(h.scene)).toBeGreaterThan(0);
    expect(visible(h.scene)).toBeLessThanOrEqual(4);

    // A fast clicker cannot flood the scene: the pool is the cap.
    for (let i = 0; i < 4; i += 1) h.runtime.trigger('heart');
    for (let i = 0; i < 4; i += 1) h.controller.renderOnce(60);
    expect(h.scene.effects.children).toHaveLength(pooled);
    expect(visible(h.scene)).toBeLessThanOrEqual(4);

    // And every burst ends: after its lifetime nothing is left on screen.
    for (let i = 0; i < 40; i += 1) h.controller.renderOnce(60);
    expect(visible(h.scene)).toBe(0);
    h.scene.destroy();
  });

  it('draws no particles at all in the reduced-motion profile', () => {
    const h = harness({ motion: 'still' }, true);
    h.controller.renderOnce(0);
    h.runtime.trigger('heart');
    for (let i = 0; i < 8; i += 1) h.controller.renderOnce(60);
    expect(visible(h.scene)).toBe(0);
    h.scene.destroy();
  });
});
