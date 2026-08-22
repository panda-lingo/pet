import type { Mood } from '../types.js';

/**
 * How each mood reads on the face and body.
 *
 * Brand constraint: "neutral expressions with gentle smiles", no exaggerated emotion.
 * So the deltas here are small — mood is legible through many small changes (brow,
 * ear droop, tail speed, posture) rather than one cartoon expression.
 */
export interface MoodPose {
  /** Degrees of head tilt. */
  headTilt: number;
  headY: number;
  browY: number;
  browAngle: number;
  mouthCurve: number;
  mouthOpen: number;
  /** Positive droops the ears down. */
  earDroop: number;
  bodyLower: number;
  eyeOpenBase: number;
  tailAmplitude: number;
  tailFrequency: number;
  blush: number;
  /** Multiplier on breathing rate. */
  breathRate: number;
}

export const MOOD_POSES: Record<Mood, MoodPose> = {
  neutral: {
    headTilt: 0,
    headY: 0,
    browY: 0,
    browAngle: 0,
    mouthCurve: 0.28,
    mouthOpen: 0,
    earDroop: 0,
    bodyLower: 0,
    eyeOpenBase: 1,
    tailAmplitude: 3,
    tailFrequency: 0.5,
    blush: 0,
    breathRate: 1,
  },
  happy: {
    headTilt: 2.5,
    headY: -0.6,
    browY: -0.8,
    browAngle: 2,
    mouthCurve: 0.8,
    mouthOpen: 0.12,
    earDroop: -2,
    bodyLower: -0.8,
    eyeOpenBase: 0.94,
    tailAmplitude: 8,
    tailFrequency: 1.5,
    blush: 0.45,
    breathRate: 1.15,
  },
  excited: {
    headTilt: 4,
    headY: -1.2,
    browY: -1.4,
    browAngle: 4,
    mouthCurve: 0.95,
    mouthOpen: 0.24,
    earDroop: -4,
    bodyLower: -1.4,
    eyeOpenBase: 1,
    tailAmplitude: 12,
    tailFrequency: 2.4,
    blush: 0.6,
    breathRate: 1.35,
  },
  curious: {
    headTilt: 7,
    headY: -0.4,
    browY: -1.6,
    browAngle: -3,
    mouthCurve: 0.2,
    mouthOpen: 0.08,
    earDroop: -3,
    bodyLower: 0,
    eyeOpenBase: 1,
    tailAmplitude: 6,
    tailFrequency: 1.1,
    blush: 0.1,
    breathRate: 1.05,
  },
  tired: {
    headTilt: -3,
    headY: 1.4,
    browY: 1.2,
    browAngle: -2,
    mouthCurve: 0.05,
    mouthOpen: 0,
    earDroop: 6,
    bodyLower: 1.6,
    eyeOpenBase: 0.55,
    tailAmplitude: 2,
    tailFrequency: 0.3,
    blush: 0,
    breathRate: 0.72,
  },
  hungry: {
    headTilt: -1.5,
    headY: 0.8,
    browY: 0.6,
    browAngle: -5,
    mouthCurve: -0.15,
    mouthOpen: 0.06,
    earDroop: 3,
    bodyLower: 0.8,
    eyeOpenBase: 0.92,
    tailAmplitude: 4,
    tailFrequency: 0.8,
    blush: 0,
    breathRate: 0.95,
  },
  lonely: {
    headTilt: -4,
    headY: 1.8,
    browY: 1.6,
    browAngle: -7,
    mouthCurve: -0.3,
    mouthOpen: 0,
    earDroop: 7,
    bodyLower: 2.2,
    eyeOpenBase: 0.85,
    tailAmplitude: 1.5,
    tailFrequency: 0.25,
    blush: 0,
    breathRate: 0.85,
  },
};
