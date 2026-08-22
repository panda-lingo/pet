import type { ReactionKind } from '../runtime.js';
import type { PoseSnapshot } from './types.js';

export interface ReactionDef {
  durationMs: number;
  /** Adds this reaction's contribution at normalised time `t` (0–1). */
  apply(pose: PoseSnapshot, t: number, amp: number): void;
}

const bell = (t: number) => Math.sin(Math.PI * Math.min(Math.max(t, 0), 1));

/**
 * One-shot reactions, layered additively on top of the held pose. Amplitudes are scaled
 * by the active motion profile, so the same reaction reads as a whisper in `calm` and as
 * a full bounce in `full`.
 */
export const REACTIONS: Record<ReactionKind, ReactionDef> = {
  // The brand's signature acknowledgement: one calm nod, nothing else.
  nod: {
    durationMs: 520,
    apply(pose, t, amp) {
      pose.headY += bell(t) * 2.6 * amp;
      pose.headRot += Math.sin(t * Math.PI * 2) * 1.6 * amp;
      pose.earLeftRot += bell(t) * 3 * amp;
      pose.earRightRot -= bell(t) * 3 * amp;
    },
  },
  squash: {
    durationMs: 420,
    apply(pose, t, amp) {
      const e = bell(t) * amp;
      pose.bodyScaleY -= 0.16 * e;
      pose.bodyScaleX += 0.13 * e;
      pose.bodyY += 1.6 * e;
      pose.mouthCurve += 0.2 * e;
    },
  },
  bounce: {
    durationMs: 760,
    apply(pose, t, amp) {
      const hop = Math.abs(Math.sin(t * Math.PI * 2)) * (1 - t);
      pose.rootY -= hop * 6 * amp;
      pose.bodyScaleY += hop * 0.06 * amp;
      pose.mouthCurve += 0.25 * bell(t);
      pose.earLeftRot -= hop * 6 * amp;
      pose.earRightRot += hop * 6 * amp;
    },
  },
  // Anticipation → flight → landing settle, per the animation brief.
  jump: {
    durationMs: 1_020,
    apply(pose, t, amp) {
      if (t < 0.22) {
        const k = t / 0.22;
        pose.bodyScaleY -= 0.12 * k * amp;
        pose.bodyScaleX += 0.09 * k * amp;
        pose.rootY += 1.8 * k * amp;
      } else if (t < 0.72) {
        const k = (t - 0.22) / 0.5;
        pose.rootY -= Math.sin(Math.PI * k) * 14 * amp;
        pose.bodyScaleY += 0.08 * amp;
        pose.legFrontRot -= 14 * amp;
        pose.legBackRot += 10 * amp;
      } else {
        const k = (t - 0.72) / 0.28;
        const settle = Math.exp(-4 * k) * Math.cos(k * Math.PI * 3);
        pose.bodyScaleY -= 0.1 * settle * amp;
        pose.bodyScaleX += 0.08 * settle * amp;
        pose.rootY += 1.2 * settle * amp;
      }
    },
  },
  heart: {
    durationMs: 1_400,
    apply(pose, t, amp) {
      pose.heart = Math.max(pose.heart, bell(t) * amp);
      pose.mouthCurve += 0.3 * bell(t);
      pose.blush += 0.4 * bell(t);
    },
  },
  sparkle: {
    durationMs: 1_200,
    apply(pose, t, amp) {
      pose.sparkle = Math.max(pose.sparkle, bell(t) * amp);
    },
  },
  wave: {
    durationMs: 1_500,
    apply(pose, t, amp) {
      const raise = Math.min(1, t / 0.2) * (1 - Math.max(0, (t - 0.8) / 0.2));
      pose.armRightRot -= (52 + Math.sin(t * Math.PI * 6) * 20) * raise * amp;
      pose.headRot += 2 * raise * amp;
      pose.mouthCurve += 0.25 * raise;
    },
  },
  blink: {
    durationMs: 190,
    apply(pose, t) {
      pose.eyeOpen = Math.min(pose.eyeOpen, 1 - bell(t) * 0.98);
    },
  },
  earTwitch: {
    durationMs: 460,
    apply(pose, t, amp) {
      pose.earRightRot += Math.sin(t * Math.PI * 3) * 11 * amp;
      pose.earLeftRot += Math.sin(t * Math.PI * 3 + 0.6) * 4 * amp;
    },
  },
  stretch: {
    durationMs: 1_600,
    apply(pose, t, amp) {
      const e = bell(t) * amp;
      pose.bodyScaleX += 0.08 * e;
      pose.bodyScaleY -= 0.05 * e;
      pose.armLeftRot -= 26 * e;
      pose.armRightRot -= 20 * e;
      pose.headY -= 1.2 * e;
      pose.eyeOpen = Math.min(pose.eyeOpen, 1 - e * 0.5);
    },
  },
  yawn: {
    durationMs: 1_800,
    apply(pose, t, amp) {
      const e = bell(t);
      pose.mouthOpen = Math.max(pose.mouthOpen, e * 0.85);
      pose.eyeOpen = Math.min(pose.eyeOpen, 1 - e * 0.9);
      pose.headRot -= 2.5 * e * amp;
      pose.headY -= 0.8 * e * amp;
    },
  },
  lookAround: {
    durationMs: 2_200,
    apply(pose, t, amp) {
      const sweep = Math.sin(t * Math.PI * 2);
      pose.headRot += sweep * 6 * amp;
      pose.pupilX += sweep * 0.8;
      pose.earLeftRot += sweep * 3 * amp;
    },
  },
};
