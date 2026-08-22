/**
 * Everything the renderers need for one frame, expressed as plain numbers.
 *
 * Angles are degrees, offsets are in a 100×100 pet-local unit box (the SVG viewBox and
 * the PixiJS container share that space), so the same pose drives both renderers.
 */
export interface PoseSnapshot {
  /** Whole-figure offsets: hops, landing settle, walk bob. */
  rootX: number;
  rootY: number;
  rootRot: number;
  rootScale: number;
  /** Squash and stretch plus breathing. */
  bodyScaleX: number;
  bodyScaleY: number;
  bodyY: number;
  bodyRot: number;
  headX: number;
  headY: number;
  headRot: number;
  earLeftRot: number;
  earRightRot: number;
  /** 1 = wide open, 0 = fully closed. */
  eyeOpen: number;
  pupilX: number;
  pupilY: number;
  browY: number;
  browAngle: number;
  /** 0 = closed mouth, 1 = fully open (speaking, yawning). */
  mouthOpen: number;
  /** −1 = downturned, +1 = smiling. */
  mouthCurve: number;
  armLeftRot: number;
  armRightRot: number;
  legFrontRot: number;
  legBackRot: number;
  tailRot: number;
  blush: number;
  shadowScale: number;
  shadowAlpha: number;
  scarfSway: number;
  /** 0–1 envelopes the renderers use to emit particles. */
  sparkle: number;
  heart: number;
}

export function createNeutralPose(): PoseSnapshot {
  return {
    rootX: 0,
    rootY: 0,
    rootRot: 0,
    rootScale: 1,
    bodyScaleX: 1,
    bodyScaleY: 1,
    bodyY: 0,
    bodyRot: 0,
    headX: 0,
    headY: 0,
    headRot: 0,
    earLeftRot: 0,
    earRightRot: 0,
    eyeOpen: 1,
    pupilX: 0,
    pupilY: 0,
    browY: 0,
    browAngle: 0,
    mouthOpen: 0,
    mouthCurve: 0.25,
    armLeftRot: 0,
    armRightRot: 0,
    legFrontRot: 0,
    legBackRot: 0,
    tailRot: 0,
    blush: 0,
    shadowScale: 1,
    shadowAlpha: 0.16,
    scarfSway: 0,
    sparkle: 0,
    heart: 0,
  };
}
