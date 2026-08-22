import type { Container } from 'pixi.js';
import {
  brandDuration,
  EYE,
  VIEW,
  type PetRuntime,
  type PoseEngine,
  type PoseSnapshot,
  type StageParams,
} from '@pet/core';
import type { PandaScene } from './buildPanda.js';
import type { ParticleLayer } from './particles.js';

/**
 * The one animation controller for Solution B.
 *
 * Same division of labour as Solution A: the shared `PoseEngine` owns the character, and this
 * file only moves it onto the renderer. Where A writes 30 CSS custom properties, B writes
 * `Container` transforms — and nothing else. No `setState`, no React, no per-frame allocation,
 * no geometry rebuilds.
 *
 * The transform algebra is deliberately the same as `panda.css`:
 *
 *     CSS   translate(offset) translate(pivot) rotate(r) scale(s) translate(-pivot)
 *     Pixi  position = pivot + offset ; pivot = pivot ; rotation = r ; scale = s
 *
 * PixiJS composes a container's local matrix as `translate(position) · rotate · scale ·
 * translate(-pivot)`, so the two rigs resolve to the same matrix for the same pose numbers.
 */

const DEG = Math.PI / 180;

export interface PixiAnimationOptions {
  scene: PandaScene;
  runtime: PetRuntime;
  engine: PoseEngine;
  /** Side of the square canvas in CSS pixels; the pet box is centred inside it. */
  canvasPx: number;
  /** Particles are opt-out so reduced motion and the unit tests can skip them entirely. */
  particles?: ParticleLayer | null;
}

export interface PixiAnimationController {
  /**
   * One ticker frame, with the gating both briefs ask for. Returns whether anything was drawn,
   * so the host can leave the renderer alone when the answer is no.
   */
  tick(dtMs: number): boolean;
  /** Advances the pose by `dtMs` and writes exactly one frame of transforms. */
  renderOnce(dtMs?: number): void;
  /** Called when the canvas is resized, e.g. crossing the mobile breakpoint. */
  resize(canvasPx: number): void;
  destroy(): void;
}

/* Every write is diffed: a still pose (reduced motion) costs nothing after the first frame. */
function setPos(target: Container, x: number, y: number): void {
  const p = target.position;
  if (p.x !== x || p.y !== y) p.set(x, y);
}

function setScale(target: Container, x: number, y: number): void {
  const s = target.scale;
  if (s.x !== x || s.y !== y) s.set(x, y);
}

function setRot(target: Container, degrees: number): void {
  const radians = degrees * DEG;
  if (target.rotation !== radians) target.rotation = radians;
}

function setAlpha(target: Container, alpha: number): void {
  if (target.alpha !== alpha) target.alpha = alpha;
}

export function createPixiAnimationController(options: PixiAnimationOptions): PixiAnimationController {
  const { scene, runtime, engine } = options;
  const particles = options.particles ?? null;
  let canvasPx = options.canvasPx;

  /**
   * A stage change swaps several proportions at once, which would pop. One short opacity fade
   * covers it — the same compromise, and the same duration, as Solution A's crossfade.
   */
  let lastStage = runtime.state.stage;
  let fadeLeft = 0;

  function write(pose: PoseSnapshot, dtMs: number): void {
    const state = runtime.state;
    const stage = state.stageParams;

    // The pet box is centred in the canvas, so a hop or a stretch has room and never clips.
    const unit = state.sizePx / VIEW;
    const inset = (canvasPx - state.sizePx) / 2;
    setPos(scene.world, inset, inset);
    setScale(scene.world, unit, unit);

    const figure = pose.rootScale * stage.overallScale;
    setPos(scene.root, scene.root.pivot.x + pose.rootX, scene.root.pivot.y + pose.rootY);
    setRot(scene.root, pose.rootRot);
    setScale(scene.root, figure * state.facing, figure);

    setAlpha(scene.shadow, pose.shadowAlpha);
    setScale(scene.shadow, pose.shadowScale, pose.shadowScale);

    setRot(scene.tail, pose.tailRot);
    setScale(scene.tail, stage.tailLength, stage.tailLength);

    setPos(scene.body, scene.body.pivot.x, scene.body.pivot.y + pose.bodyY);
    setRot(scene.body, pose.bodyRot);
    setScale(scene.body, pose.bodyScaleX * stage.bodyScale, pose.bodyScaleY * stage.bodyScale);

    // Left limbs mirror the right, so one signed pose value drives both sides.
    setRot(scene.legLeft, -pose.legFrontRot);
    setRot(scene.legRight, pose.legBackRot);
    setScale(scene.legLeft, 1, stage.legLength);
    setScale(scene.legRight, 1, stage.legLength);
    setRot(scene.armLeft, -pose.armLeftRot);
    setRot(scene.armRight, pose.armRightRot);
    setRot(scene.scarf, pose.scarfSway);

    writeHead(pose, stage);
    crossfade(dtMs);
    particles?.update(pose, dtMs, state);
  }

  function writeHead(pose: PoseSnapshot, stage: StageParams): void {
    // The head is a sibling of the torso, so squash never distorts the face — but it still rides
    // the breath by adding `bodyY` to its own offset, exactly as `panda.css` does.
    setPos(scene.head, scene.head.pivot.x + pose.headX, scene.head.pivot.y + pose.headY + pose.bodyY);
    setRot(scene.head, pose.headRot);
    setScale(scene.head, stage.headScale, stage.headScale);
    setRot(scene.earLeft, pose.earLeftRot);
    setRot(scene.earRight, pose.earRightRot);
    setScale(scene.earLeft, stage.earScale, stage.earScale);
    setScale(scene.earRight, stage.earScale, stage.earScale);

    setScale(scene.eyeLeft, stage.eyeScale, stage.eyeScale);
    setScale(scene.eyeRight, stage.eyeScale, stage.eyeScale);
    setScale(scene.lidLeft, 1, pose.eyeOpen);
    setScale(scene.lidRight, 1, pose.eyeOpen);
    const gazeX = pose.pupilX * EYE.pupilRangeX;
    const gazeY = pose.pupilY * EYE.pupilRangeY;
    setPos(scene.pupilLeft, EYE.left.cx + gazeX, EYE.left.cy + gazeY);
    setPos(scene.pupilRight, EYE.right.cx + gazeX, EYE.right.cy + gazeY);
    setAlpha(scene.lashLeft, 1 - pose.eyeOpen);
    setAlpha(scene.lashRight, 1 - pose.eyeOpen);

    setPos(scene.browLeft, scene.browLeft.pivot.x, scene.browLeft.pivot.y + pose.browY);
    setPos(scene.browRight, scene.browRight.pivot.x, scene.browRight.pivot.y + pose.browY);
    setRot(scene.browLeft, pose.browAngle);
    setRot(scene.browRight, -pose.browAngle);

    setScale(scene.mouthCurve, 1, pose.mouthCurve);
    setScale(scene.mouthOpen, 1, pose.mouthOpen);
    setAlpha(scene.mouthOpen, pose.mouthOpen);
    // Cheek markings are a life-stage feature; blush is a mood. One alpha carries both, so a
    // blushing baby still shows colour on cheeks it does not yet have markings on.
    setAlpha(scene.cheeks, Math.max(stage.showMarkings ? 0.42 : 0, pose.blush));
  }

  function crossfade(dtMs: number): void {
    const state = runtime.state;
    if (state.stage !== lastStage) {
      lastStage = state.stage;
      fadeLeft = state.capabilities.amplitude === 0 ? 0 : brandDuration.slow;
    }
    if (fadeLeft <= 0) {
      setAlpha(scene.root, 1);
      return;
    }
    fadeLeft = Math.max(0, fadeLeft - dtMs);
    setAlpha(scene.root, 0.55 + 0.45 * (1 - fadeLeft / brandDuration.slow));
  }

  return {
    tick(dtMs: number): boolean {
      const state = runtime.state;
      // Nothing runs while the tab is in the background or the pet is hidden.
      if (typeof document !== 'undefined' && document.hidden) return false;
      if (!state.visible) return false;
      // A paused pet holds its last frame. Reactions queued meanwhile are dropped rather than
      // replayed all at once when it resumes.
      if (state.paused) {
        runtime.takeReactions();
        return false;
      }
      write(engine.update(dtMs), dtMs);
      return true;
    },
    renderOnce(dtMs = 0): void {
      write(engine.update(dtMs), dtMs);
    },
    resize(next: number): void {
      canvasPx = next;
    },
    destroy(): void {
      particles?.clear();
    },
  };
}
