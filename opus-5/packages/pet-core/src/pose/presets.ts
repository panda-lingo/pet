import type { PetPose } from '../runtime.js';
import type { PoseSnapshot } from './types.js';

export interface PresetContext {
  pose: PoseSnapshot;
  /** Seconds since the controller started. */
  time: number;
  /** Accumulated walk cycle phase in turns. */
  walkPhase: number;
  amp: number;
  /** Life-stage movement speed multiplier. */
  speed: number;
}

/**
 * Held poses. Each one documents its own transform intent; the renderers only apply
 * numbers, they never decide what a pose looks like.
 */
export function applyPosePreset(kind: PetPose, ctx: PresetContext): void {
  const { pose, time, amp, speed } = ctx;
  switch (kind) {
    case 'stand':
      return;
    case 'sit': {
      // Weight settles back: body drops, front legs straighten, ears relax.
      pose.bodyY += 3.2;
      pose.rootY += 1.4;
      pose.legFrontRot -= 6;
      pose.legBackRot += 16;
      pose.armLeftRot += 6;
      pose.armRightRot -= 6;
      pose.shadowScale += 0.06;
      return;
    }
    case 'sleep': {
      const breath = Math.sin(time * Math.PI * 2 * 0.16) * 1.4 * amp;
      pose.eyeOpen = 0.03;
      pose.bodyY += 4 + breath;
      pose.bodyScaleY += breath * 0.02;
      pose.headY += 2.6;
      pose.headRot -= 4;
      pose.earLeftRot += 6;
      pose.earRightRot -= 6;
      pose.mouthCurve = 0.15;
      pose.tailRot *= 0.3;
      pose.shadowScale += 0.08;
      return;
    }
    case 'walk': {
      const phase = ctx.walkPhase * Math.PI * 2;
      // Alternating diagonal gait with a small vertical bob.
      pose.legFrontRot += Math.sin(phase) * 20 * amp;
      pose.legBackRot += Math.sin(phase + Math.PI) * 20 * amp;
      pose.armLeftRot += Math.sin(phase + Math.PI) * 16 * amp;
      pose.armRightRot += Math.sin(phase) * 16 * amp;
      pose.rootY -= Math.abs(Math.sin(phase)) * 1.5 * amp;
      pose.bodyRot += Math.sin(phase) * 1.2 * amp;
      pose.headY -= Math.abs(Math.sin(phase)) * 0.6 * amp;
      pose.tailRot += Math.sin(phase) * 6 * amp;
      pose.shadowScale -= Math.abs(Math.sin(phase)) * 0.04;
      return;
    }
    case 'point': {
      // Front paw lifts toward the target; the head follows a touch behind it.
      const settle = Math.sin(time * Math.PI * 2 * 0.5 * speed) * 1.5 * amp;
      pose.armRightRot -= 62 + settle;
      pose.headRot += 3;
      pose.headX += 1.2;
      pose.browY -= 0.6;
      return;
    }
    case 'wave': {
      const swing = Math.sin(time * Math.PI * 2 * 1.6 * speed);
      pose.armRightRot -= 54 + swing * 18 * amp;
      pose.headRot += swing * 2 * amp;
      pose.mouthCurve += 0.2;
      return;
    }
    case 'celebrate': {
      const pulse = Math.sin(time * Math.PI * 2 * 1.1 * speed);
      pose.armLeftRot -= 46 + pulse * 10 * amp;
      pose.armRightRot -= 46 - pulse * 10 * amp;
      pose.headY -= 0.8 * amp;
      pose.mouthCurve += 0.35;
      pose.sparkle = Math.max(pose.sparkle, 0.55 + pulse * 0.2);
      return;
    }
  }
}
