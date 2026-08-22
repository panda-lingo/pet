/**
 * Authored panda artwork, in a 100×100 pet-local box.
 *
 * These numbers live in the domain package for the same reason the brand tokens do: both
 * renderers must resolve the *same* geometry. Solution A turns them into SVG shapes and CSS
 * custom properties; Solution B turns them into PixiJS `GraphicsContext` geometry and
 * `Container` pivots. One source, so the two pandas cannot drift apart.
 *
 * Nothing here knows about SVG, CSS or PixiJS — it is plain data, in the same unit space the
 * pose engine uses, so a pose maps onto either renderer without conversion.
 */

/** Width and height of the pet-local box. */
export const VIEW = 100;

/** Ground contact line. `rootScale`, the feet and the shadow all key off it. */
export const GROUND = 93;

/**
 * Transform origins for every animated group, in pet-local units.
 *
 * - `figure`  ground contact point — whole-figure scale grows upward, never into the floor
 * - `torso`   hips — breathing and squash expand up from the pelvis
 * - `head`    neck joint — nods rotate around the throat, not the skull centre
 * - `ear*`    the point where the ear meets the skull
 * - `eye*`    eye centre — lids close symmetrically, pupils orbit it
 * - `brow*`   brow midpoint — `browAngle` pivots there, `browY` only translates
 * - `mouth`   lip line — a positive curve arcs down into a smile, negative flips to a frown
 * - `arm*`    shoulder
 * - `leg*`    hip
 * - `tail`    tail attachment on the lower back
 * - `scarf`   knot where the hanging end leaves the band
 * - `shadow`  centre of the contact ellipse
 */
export const PIVOT = {
  figure: [50, GROUND],
  torso: [50, 90],
  head: [50, 52],
  earLeft: [33, 18],
  earRight: [67, 18],
  eyeLeft: [41.4, 31],
  eyeRight: [58.6, 31],
  browLeft: [40.6, 19.3],
  browRight: [59.4, 19.3],
  mouth: [50, 44.8],
  armLeft: [35.5, 61],
  armRight: [64.5, 61],
  legLeft: [42, 80],
  legRight: [58, 80],
  tail: [29, 74],
  scarf: [61.5, 60.4],
  shadow: [50, 93.5],
} as const satisfies Record<string, readonly [number, number]>;

export type PivotName = keyof typeof PIVOT;
/** Face landmarks. Kept as data so the head parts and the tests agree on one layout. */
export const HEAD = { cx: 50, cy: 32, r: 23 } as const;

export const EAR = {
  left: { cx: 30, cy: 15 },
  right: { cx: 70, cy: 15 },
  r: 9.4,
  innerR: 4.8,
} as const;

export const EYE = {
  /**
   * Ink patch: angled inwards, which is what makes the face read as calm rather than cute.
   *
   * `rx` is deliberately small enough that the two patches never touch at the bridge of the
   * nose — a merged band reads as sunglasses instead of panda markings.
   */
  patch: { rx: 7.8, ry: 8.8, tilt: 12 },
  left: { cx: 41.4, cy: 31 },
  right: { cx: 58.6, cy: 31 },
  whiteRx: 4.6,
  whiteRy: 4.2,
  pupilR: 3,
  /** Pupil travel for a full −1…1 gaze, in pet-local units. */
  pupilRangeX: 2,
  pupilRangeY: 1.5,
} as const;

export const CHEEK = { left: { cx: 32.8, cy: 41.4 }, right: { cx: 67.2, cy: 41.4 }, rx: 5.8, ry: 3.7 } as const;

export const MUZZLE = { cx: 50, cy: 43.8, rx: 10.8, ry: 7.6 } as const;

/** Open-mouth shape, scaled vertically from the lip line by `mouthOpen`. */
export const MOUTH_OPEN = { cx: 50, cy: 47, rx: 4.4, ry: 3.5 } as const;
/**
 * Outlines, as SVG path data. Every path is a smooth curve — the brand forbids hard cartoon
 * outlines, so the silhouette carries the character instead.
 *
 * The strings are path *data*, not markup: Solution A hands them to `<path d>`, Solution B
 * hands them to PixiJS `GraphicsPath`, which parses the same grammar.
 */
export const PATH = {
  /** Torso: an egg that is widest below the middle, so the pet reads as seated weight. */
  torso:
    'M50 47c10.8 0 17.6 6.6 19.6 16 1.7 7.8 2 15.6 0.7 21.2-1.4 5.4-9.4 8.3-20.3 8.3s-18.9-2.9-20.3-8.3c-1.3-5.6-1-13.4 0.7-21.2C32.4 53.6 39.2 47 50 47Z',
  /** Front paw arms, drawn as thick round strokes from the shoulder. */
  armLeft: 'M35.5 61c-5 5.4-7 12.6-6.8 19.4',
  armRight: 'M64.5 61c5 5.4 7 12.6 6.8 19.4',
  legLeft: 'M42 80c-2.6 4-2.8 8-1.5 11',
  legRight: 'M58 80c2.6 4 2.8 8 1.5 11',
  /** Nose: a rounded triangle, never a cartoon button. */
  nose: 'M46.6 39.8c0.3-1.2 1.7-1.9 3.4-1.9s3.1 0.7 3.4 1.9c0.3 1.4-1.4 3.1-3.4 3.1s-3.7-1.7-3.4-3.1Z',
  /** Mouth curve: endpoints sit on the lip line so `mouthCurve` can flip it cleanly. */
  mouth: 'M45.4 44.8Q50 49.6 54.6 44.8',
  /** Brows sit ~2 units clear of the patches, so a lift or a tilt never sinks into the ink. */
  browLeft: 'M36.8 20.2q3.8-2.7 7.6-1.8',
  browRight: 'M63.2 20.2q-3.8-2.7-7.6-1.8',
  /** Scarf band across the neck: the identity marker shared with the hero illustration. */
  scarfBand:
    'M33.6 51c10.2 5.6 22.6 5.6 32.8 0 2.8 2.6 3.6 7 1.7 9.9-11.6 5.4-24.6 5.4-36.2 0-1.9-2.9-1.1-7.3 1.7-9.9Z',
  scarfEnd:
    'M61.5 60.4c3.6 1.3 5.5 6.4 4.9 13.4-0.4 4-1.3 7.4-3 9.6-2.5-0.9-4.2-2.8-4.4-5.3-0.6-6-0.4-12.3 2.5-17.7Z',
  scarfFold: 'M35.6 53c8.6 4.4 20.2 4.4 28.8 0',
} as const;

export const LIMB = {
  armWidth: 11,
  legWidth: 11,
  pawR: 5.4,
  /** Paw and foot centres, so the ink pads line up with the stroke ends exactly. */
  pawLeft: { cx: 28.7, cy: 80.4 },
  pawRight: { cx: 71.3, cy: 80.4 },
  footLeft: { cx: 40.5, cy: 91, rx: 7, ry: 3.8 },
  footRight: { cx: 59.5, cy: 91, rx: 7, ry: 3.8 },
} as const;

/**
 * Tail. A rounded nub on the left flank, placed so its outer arc clears the arm ink *and* sits
 * above the paw pad — otherwise the three ink masses merge and `tailWag`, one of the mood tells
 * the briefs ask to be visible, has nothing visible to move.
 */
export const TAIL = { cx: 22.6, cy: 75, r: 5.5 } as const;

export const SHADOW = { cx: 50, cy: 93.5, rx: 22, ry: 4.2 } as const;

export const BELLY = { cx: 50, cy: 73, rx: 13.6, ry: 14.5 } as const;
