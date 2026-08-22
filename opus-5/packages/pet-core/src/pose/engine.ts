import { damp, mulberry32, randomRange } from '../motion.js';
import type { PetPose, PetRuntime, ReactionKind } from '../runtime.js';
import { clamp } from '../types.js';
import { MOOD_POSES } from './moodPose.js';
import { applyPosePreset } from './presets.js';
import { REACTIONS } from './reactions.js';
import { createNeutralPose, type PoseSnapshot } from './types.js';

interface ActiveReaction {
  kind: ReactionKind;
  elapsed: number;
}

const NEUTRAL = createNeutralPose();

/**
 * The authoritative animation controller shared by both solutions.
 *
 * It owns every timer (blink, saccade, walk phase, one-shot reactions), reads the mutable
 * runtime state, and returns one reused `PoseSnapshot` per frame — no allocation, no React
 * involvement. The SVG app writes the numbers into CSS custom properties; the PixiJS app
 * writes them onto container transforms.
 */
export class PoseEngine {
  private readonly pose = createNeutralPose();
  private readonly rng: () => number;
  private readonly active: ActiveReaction[] = [];
  private time = 0;
  private blinkIn: number;
  private saccadeIn = 1.4;
  private saccadeX = 0;
  private saccadeY = 0;
  private gazeX = 0;
  private gazeY = 0;
  private headRot = 0;
  private headX = 0;
  private headY = 0;
  private walkPhase = 0;

  constructor(
    private readonly runtime: PetRuntime,
    options: { rng?: () => number } = {},
  ) {
    this.rng = options.rng ?? mulberry32(0x50a1);
    this.blinkIn = randomRange(this.rng, 1.4, 3.8);
  }

  trigger(kind: ReactionKind): void {
    const existing = this.active.find((entry) => entry.kind === kind);
    if (existing) {
      existing.elapsed = 0;
      return;
    }
    if (this.active.length >= 6) this.active.shift();
    this.active.push({ kind, elapsed: 0 });
  }

  update(dtMs: number): PoseSnapshot {
    const state = this.runtime.state;
    const caps = state.capabilities;
    const mood = MOOD_POSES[state.mood];
    const speed = state.stageParams.movementSpeed;
    const amp = caps.amplitude;
    // Long gaps (tab switch, breakpoint at a debugger) must not teleport the pose.
    const dt = clamp(dtMs, 0, 64) / 1000;
    const pose = this.pose;

    for (const kind of this.runtime.takeReactions()) this.trigger(kind);
    Object.assign(pose, NEUTRAL);

    pose.headRot += mood.headTilt;
    pose.headY += mood.headY;
    pose.browY += mood.browY;
    pose.browAngle += mood.browAngle;
    pose.mouthCurve = mood.mouthCurve;
    pose.mouthOpen += mood.mouthOpen;
    pose.earLeftRot += mood.earDroop;
    pose.earRightRot -= mood.earDroop;
    pose.bodyY += mood.bodyLower;
    pose.blush += mood.blush;
    pose.eyeOpen = mood.eyeOpenBase;

    if (amp === 0) return this.stillFrame(state.pose, speed);

    this.time += dt;
    const t = this.time;

    if (caps.breathing) {
      const breath = Math.sin(t * Math.PI * 2 * 0.26 * mood.breathRate * speed);
      pose.bodyScaleY += breath * 0.018 * amp;
      pose.bodyScaleX -= breath * 0.012 * amp;
      pose.bodyY -= breath * 0.7 * amp;
      pose.scarfSway = breath * 2 * amp;
    }

    // Idle weight shifting: a slow lean that keeps the silhouette alive.
    const shift = Math.sin(t * Math.PI * 2 * 0.11);
    pose.rootX += shift * 0.9 * amp;
    pose.bodyRot += shift * 1.1 * amp;
    pose.rootRot += shift * 0.5 * amp;

    if (caps.blinking && state.pose !== 'sleep') {
      this.blinkIn -= dt;
      if (this.blinkIn <= 0) {
        this.trigger('blink');
        // Irregular, with an occasional double blink.
        this.blinkIn = this.rng() < 0.18 ? 0.3 : randomRange(this.rng, 2.2, 5.8);
      }
    }

    this.updateGaze(state.gaze.x, state.gaze.y, caps.pupilTracking, caps.headTracking, dt);
    pose.pupilX += this.gazeX;
    pose.pupilY += this.gazeY;
    pose.headRot += this.headRot * amp;
    pose.headX += this.headX * amp;
    pose.headY += this.headY * amp;

    if (caps.tailMotion) {
      pose.tailRot += Math.sin(t * Math.PI * 2 * mood.tailFrequency * speed) * mood.tailAmplitude * amp;
    }

    if (state.pose === 'walk' && caps.walk) this.walkPhase += dt * 1.9 * speed;
    const held = state.pose === 'walk' && !caps.walk ? 'stand' : state.pose;
    applyPosePreset(held, { pose, time: t, walkPhase: this.walkPhase, amp, speed });

    if (state.speaking) {
      pose.mouthOpen = Math.max(pose.mouthOpen, 0.16 + Math.abs(Math.sin(t * Math.PI * 2 * 3.1)) * 0.2);
    }

    if (state.petting > 0) {
      const petting = clamp(state.petting, 0, 1);
      pose.eyeOpen = Math.min(pose.eyeOpen, 1 - 0.55 * petting);
      pose.mouthCurve += 0.3 * petting;
      pose.blush += 0.4 * petting;
      pose.headY += 0.7 * petting;
    }

    this.applyReactions(dtMs, amp);
    if (!caps.particles) {
      pose.sparkle = 0;
      pose.heart = 0;
    }
    return this.finish();
  }

  private updateGaze(rawX: number, rawY: number, pupils: boolean, head: boolean, dt: number): void {
    if (pupils) {
      this.saccadeIn -= dt;
      if (this.saccadeIn <= 0) {
        this.saccadeX = randomRange(this.rng, -0.3, 0.3);
        this.saccadeY = randomRange(this.rng, -0.18, 0.18);
        this.saccadeIn = randomRange(this.rng, 0.9, 2.8);
      }
    } else {
      this.saccadeX = 0;
      this.saccadeY = 0;
    }
    const targetX = pupils ? clamp(clamp(rawX, -1, 1) + this.saccadeX, -1, 1) : 0;
    const targetY = pupils ? clamp(clamp(rawY, -1, 1) + this.saccadeY, -1, 1) : 0;
    this.gazeX = damp(this.gazeX, targetX, 7, dt);
    this.gazeY = damp(this.gazeY, targetY, 7, dt);
    // Head tracking lags the pupils on purpose and is clamped to a small range.
    this.headRot = damp(this.headRot, head ? clamp(rawX, -1, 1) * 7 : 0, 2.6, dt);
    this.headX = damp(this.headX, head ? clamp(rawX, -1, 1) * 1.6 : 0, 2.2, dt);
    this.headY = damp(this.headY, head ? clamp(rawY, -1, 1) * 1.2 : 0, 2.2, dt);
  }

  private applyReactions(dtMs: number, amp: number): void {
    for (let index = this.active.length - 1; index >= 0; index -= 1) {
      const entry = this.active[index];
      if (!entry) continue;
      const def = REACTIONS[entry.kind];
      entry.elapsed += dtMs;
      const progress = entry.elapsed / def.durationMs;
      if (progress >= 1) {
        this.active.splice(index, 1);
        continue;
      }
      // Blinks always close fully, otherwise the calm profile would leave eyes ajar.
      def.apply(this.pose, progress, entry.kind === 'blink' ? 1 : amp);
    }
  }

  /** `prefers-reduced-motion`: one static, readable frame. */
  private stillFrame(held: PetPose, speed: number): PoseSnapshot {
    const pose = this.pose;
    pose.eyeOpen = Math.max(0.7, pose.eyeOpen);
    pose.pupilX = 0;
    pose.pupilY = 0;
    applyPosePreset(held === 'walk' ? 'stand' : held, { pose, time: 0, walkPhase: 0, amp: 0, speed });
    pose.sparkle = 0;
    pose.heart = 0;
    return this.finish();
  }

  private finish(): PoseSnapshot {
    const pose = this.pose;
    pose.eyeOpen = clamp(pose.eyeOpen, 0, 1);
    pose.mouthOpen = clamp(pose.mouthOpen, 0, 1);
    pose.mouthCurve = clamp(pose.mouthCurve, -1, 1);
    pose.pupilX = clamp(pose.pupilX, -1.2, 1.2);
    pose.pupilY = clamp(pose.pupilY, -1.2, 1.2);
    pose.bodyScaleX = clamp(pose.bodyScaleX, 0.6, 1.4);
    pose.bodyScaleY = clamp(pose.bodyScaleY, 0.6, 1.4);
    pose.shadowScale = clamp(pose.shadowScale + pose.rootY * 0.01, 0.6, 1.3);
    pose.shadowAlpha = clamp(0.16 + pose.rootY * 0.003, 0.04, 0.2);
    pose.blush = clamp(pose.blush, 0, 1);
    return pose;
  }
}
