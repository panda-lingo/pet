import {
  Container,
  FillGradient,
  Graphics,
  GraphicsContext,
  GraphicsPath,
  type FillInput,
  type StrokeInput,
} from 'pixi.js';
import {
  BELLY,
  CHEEK,
  EAR,
  EYE,
  HEAD,
  LIMB,
  MOUTH_OPEN,
  MUZZLE,
  PATH,
  PIVOT,
  SHADOW,
  TAIL,
  type PivotName,
} from '@pet/core';
import { createPaints, type PandaPaints, type PaintOptions } from './paints.js';

/**
 * The panda as a PixiJS scene graph, built from source geometry — no textures, no sprite
 * sheets, no external artwork.
 *
 * Two rules keep this rig honest, and they are the same two Solution A follows:
 *
 * 1. Every shape is drawn in absolute pet-local coordinates (the 100×100 box the pose engine
 *    works in), so a child's coordinates are readable next to `artwork.ts` without mental
 *    arithmetic.
 * 2. Every animated container therefore sets `pivot` *and* `position` to its transform origin
 *    from `PIVOT`. That is the exact analogue of the CSS `translate(pivot) … translate(-pivot)`
 *    trick in `panda.css`, and it means a rotation can never resolve against a shape's bounding
 *    box by accident.
 *
 * Geometry is built once into `GraphicsContext` objects and cached per page, so the live pet and
 * every gallery cell share one set of paths and one set of gradient textures.
 */

/** Every container the animation controller drives, and nothing else. */
export interface PandaScene {
  /** Scales pet-local units to CSS pixels. Parent of the shadow and the figure. */
  world: Container;
  /** Stays on the floor: it never inherits the hop offset, only its own scale and alpha. */
  shadow: Container;
  /** Solution A calls this `figure` — the whole pet above the floor. */
  root: Container;
  tail: Container;
  body: Container;
  backLegs: Container;
  legLeft: Container;
  legRight: Container;
  frontLegs: Container;
  armLeft: Container;
  armRight: Container;
  /** Paw pads ride the arm ends, so a wave carries the pad with it. */
  pawLeft: Container;
  pawRight: Container;
  scarf: Container;
  head: Container;
  earLeft: Container;
  earRight: Container;
  eyeLeft: Container;
  eyeRight: Container;
  /** Lids scale vertically about the eye centre; `eyeOpen` 0 is a closed eye. */
  lidLeft: Container;
  lidRight: Container;
  pupilLeft: Container;
  pupilRight: Container;
  /** Lash arcs fade in as the lids close, so a blink still reads at 48 px. */
  lashLeft: Graphics;
  lashRight: Graphics;
  browLeft: Container;
  browRight: Container;
  muzzle: Container;
  nose: Container;
  mouthCurve: Container;
  mouthOpen: Container;
  cheeks: Container;
  /** Hearts and sparkles are parented here, above the figure but below nothing. */
  effects: Container;
  /** Frees the containers. Shared geometry and gradients outlive individual scenes. */
  destroy(): void;
}

/**
 * One `GraphicsContext` per shape, built once and shared by every `Graphics` on the page.
 *
 * `Graphics` that receive a context in their constructor never destroy it, which is what makes
 * this safe: a gallery cell can be torn down without taking the live pet's geometry with it.
 */
interface PandaGeometry {
  shadow: GraphicsContext;
  torso: GraphicsContext;
  belly: GraphicsContext;
  armLeft: GraphicsContext;
  armRight: GraphicsContext;
  /** Centred on the origin, so both paws and both feet reuse one shape. */
  paw: GraphicsContext;
  foot: GraphicsContext;
  legLeft: GraphicsContext;
  legRight: GraphicsContext;
  tail: GraphicsContext;
  scarfBand: GraphicsContext;
  scarfEnd: GraphicsContext;
  scarfFold: GraphicsContext;
  headBall: GraphicsContext;
  earLeft: GraphicsContext;
  earRight: GraphicsContext;
  /** Eye parts are centred on the origin: the eye container places them and tilts the patch. */
  patch: GraphicsContext;
  eyeWhite: GraphicsContext;
  pupil: GraphicsContext;
  lash: GraphicsContext;
  browLeft: GraphicsContext;
  browRight: GraphicsContext;
  cheeks: GraphicsContext;
  muzzle: GraphicsContext;
  nose: GraphicsContext;
  mouthCurve: GraphicsContext;
  mouthOpen: GraphicsContext;
}

/** Anything `paints.ts` hands out, in the shape `fill()` wants. */
type Paint = PandaPaints['fur'] | PandaPaints['belly'];

function fillWith(value: Paint, alpha = 1): FillInput {
  if (typeof value === 'number') return { color: value, alpha };
  if (value instanceof FillGradient) return { fill: value, alpha };
  return { color: value.color, alpha };
}

/** `d` is SVG path data from `artwork.ts`; PixiJS parses the same grammar Solution A does. */
function filled(d: string, style: FillInput): GraphicsContext {
  return new GraphicsContext().path(new GraphicsPath(d)).fill(style);
}

/** Limbs are round strokes, not outlines: the brand asks for soft, weighted shapes. */
function stroked(d: string, style: StrokeInput): GraphicsContext {
  return new GraphicsContext().path(new GraphicsPath(d)).stroke(style);
}

/** A limb stroke in ink, gradient or flat depending on what the paints could build. */
function inkStroke(paint: Paint, width: number): StrokeInput {
  const base = { width, cap: 'round', join: 'round' } as const;
  if (typeof paint === 'number') return { ...base, color: paint };
  if (paint instanceof FillGradient) return { ...base, fill: paint };
  return { ...base, color: paint.color };
}

function buildGeometry(paints: PandaPaints): PandaGeometry {
  const ink = fillWith(paints.ink);
  return {
    shadow: new GraphicsContext().ellipse(SHADOW.cx, SHADOW.cy, SHADOW.rx, SHADOW.ry).fill(fillWith(paints.shadow)),
    torso: filled(PATH.torso, fillWith(paints.fur)),
    belly: new GraphicsContext().ellipse(BELLY.cx, BELLY.cy, BELLY.rx, BELLY.ry).fill(fillWith(paints.belly)),
    armLeft: stroked(PATH.armLeft, inkStroke(paints.ink, LIMB.armWidth)),
    armRight: stroked(PATH.armRight, inkStroke(paints.ink, LIMB.armWidth)),
    legLeft: stroked(PATH.legLeft, inkStroke(paints.ink, LIMB.legWidth)),
    legRight: stroked(PATH.legRight, inkStroke(paints.ink, LIMB.legWidth)),
    paw: new GraphicsContext().circle(0, 0, LIMB.pawR).fill(ink),
    foot: new GraphicsContext().ellipse(0, 0, LIMB.footLeft.rx, LIMB.footLeft.ry).fill(ink),
    tail: new GraphicsContext().circle(TAIL.cx, TAIL.cy, TAIL.r).fill(ink),
    scarfBand: filled(PATH.scarfBand, fillWith(paints.scarf)),
    scarfEnd: filled(PATH.scarfEnd, { color: paints.scarfDeep }),
    scarfFold: stroked(PATH.scarfFold, { color: paints.scarfDeep, width: 1.1, alpha: 0.5, cap: 'round' }),
    headBall: new GraphicsContext().circle(HEAD.cx, HEAD.cy, HEAD.r).fill(fillWith(paints.head)),
    earLeft: ear(EAR.left, paints, ink),
    earRight: ear(EAR.right, paints, ink),
    patch: new GraphicsContext().ellipse(0, 0, EYE.patch.rx, EYE.patch.ry).fill(ink),
    eyeWhite: new GraphicsContext().ellipse(0, 0, EYE.whiteRx, EYE.whiteRy).fill({ color: paints.muzzle, alpha: 0.96 }),
    pupil: new GraphicsContext()
      .circle(0, 0, EYE.pupilR)
      .fill({ color: paints.pupil })
      // The glint sits up and to the left, where the brand puts the light.
      .circle(-1, -1.1, 0.95)
      .fill({ color: paints.eyeWhite, alpha: 0.92 }),
    lash: stroked('M-4.4 0q4.4 2.6 8.8 0', { color: paints.muzzle, width: 1.5, cap: 'round' }),
    browLeft: stroked(PATH.browLeft, { color: paints.coatShade, width: 1.8, cap: 'round' }),
    browRight: stroked(PATH.browRight, { color: paints.coatShade, width: 1.8, cap: 'round' }),
    cheeks: new GraphicsContext()
      .ellipse(CHEEK.left.cx, CHEEK.left.cy, CHEEK.rx, CHEEK.ry)
      .ellipse(CHEEK.right.cx, CHEEK.right.cy, CHEEK.rx, CHEEK.ry)
      .fill({ color: paints.cheek }),
    muzzle: new GraphicsContext().ellipse(MUZZLE.cx, MUZZLE.cy, MUZZLE.rx, MUZZLE.ry).fill({ color: paints.muzzle }),
    nose: filled(PATH.nose, ink),
    mouthCurve: stroked(PATH.mouth, { color: paints.inkFlat, width: 2, cap: 'round' }),
    mouthOpen: new GraphicsContext()
      .ellipse(MOUTH_OPEN.cx, MOUTH_OPEN.cy, MOUTH_OPEN.rx, MOUTH_OPEN.ry)
      .fill({ color: paints.inkFlat }),
  };
}

/** Ink ear with a softer inner lobe, so the silhouette still reads at 48 px. */
function ear(at: { cx: number; cy: number }, paints: PandaPaints, ink: FillInput): GraphicsContext {
  return new GraphicsContext()
    .circle(at.cx, at.cy, EAR.r)
    .fill(ink)
    .circle(at.cx, at.cy + 1.2, EAR.innerR)
    .fill({ color: paints.inkSoft, alpha: 0.85 });
}

const geometryCache = new Map<boolean, PandaGeometry>();

/** Paints and geometry are cached together: one set per page, per gradient capability. */
function sharedGeometry(gradients: boolean): { paints: PandaPaints; geometry: PandaGeometry } {
  const paints = createPaints({ gradients });
  let geometry = geometryCache.get(gradients);
  if (!geometry) {
    geometry = buildGeometry(paints);
    geometryCache.set(gradients, geometry);
  }
  return { paints, geometry };
}

/** A leaf drawn in absolute pet-local coordinates: no transform of its own. */
function shape(context: GraphicsContext, label: string): Graphics {
  return new Graphics({ context, label });
}

/** A leaf whose geometry is centred on the origin, so it needs placing. */
function place(context: GraphicsContext, label: string, x: number, y: number): Graphics {
  return new Graphics({ context, label, x, y });
}

/**
 * An animated container.
 *
 * `pivot` and `position` are both the part's transform origin from `PIVOT`, so children keep
 * absolute coordinates while rotation and scale resolve at the joint — never at a bounding box.
 */
function joint(name: PivotName, label: string = name): Container {
  const [x, y] = PIVOT[name];
  const container = new Container({ label });
  container.pivot.set(x, y);
  container.position.set(x, y);
  return container;
}

interface EyeParts {
  eye: Container;
  lid: Container;
  pupil: Container;
  lash: Graphics;
}

/** Patch, lid, white, pupil and lash, all pivoting on one eye centre. */
function buildEye(side: 'Left' | 'Right', geometry: PandaGeometry): EyeParts {
  const centre = side === 'Left' ? EYE.left : EYE.right;
  const name = `eye${side}` as PivotName;
  const eye = joint(name);
  const lid = joint(name, `lid${side}`);
  const pupil = new Container({ label: `pupil${side}`, x: centre.cx, y: centre.cy });
  pupil.addChild(shape(geometry.pupil, 'pupil'));
  lid.addChild(place(geometry.eyeWhite, 'white', centre.cx, centre.cy), pupil);
  const patch = place(geometry.patch, 'patch', centre.cx, centre.cy);
  patch.rotation = ((side === 'Left' ? -EYE.patch.tilt : EYE.patch.tilt) * Math.PI) / 180;
  // Outside the lid, so a closing eye reveals the lash instead of squashing it.
  const lash = place(geometry.lash, `lash${side}`, centre.cx, centre.cy);
  lash.alpha = 0;
  eye.addChild(patch, lid, lash);
  return { eye, lid, pupil, lash };
}

/**
 * Builds one panda. Cheap enough to call per gallery cell: only containers are new, the geometry
 * and the gradient textures are shared.
 */
export function buildPanda(options: PaintOptions = {}): PandaScene {
  const { geometry } = sharedGeometry(options.gradients ?? true);

  const world = new Container({ label: 'world' });
  // The contact shadow is a sibling of the figure, so a hop lifts the pet away from it.
  const shadow = joint('shadow');
  shadow.addChild(shape(geometry.shadow, 'contact-shadow'));

  const root = joint('figure');
  const tail = joint('tail');
  tail.addChild(shape(geometry.tail, 'tail-nub'));

  const legLeft = joint('legLeft');
  legLeft.addChild(
    shape(geometry.legLeft, 'leg-left'),
    place(geometry.foot, 'foot-left', LIMB.footLeft.cx, LIMB.footLeft.cy),
  );
  const legRight = joint('legRight');
  legRight.addChild(
    shape(geometry.legRight, 'leg-right'),
    place(geometry.foot, 'foot-right', LIMB.footRight.cx, LIMB.footRight.cy),
  );
  const backLegs = new Container({ label: 'backLegs' });
  backLegs.addChild(legLeft, legRight);

  // Breathing and squash happen here, about the hips; the head is a sibling so the face keeps
  // its shape while still riding the breath.
  const body = joint('torso', 'body');

  // Paws are children of the arms: a wave carries the pad with the limb.
  const pawLeft = new Container({ label: 'pawLeft', x: LIMB.pawLeft.cx, y: LIMB.pawLeft.cy });
  pawLeft.addChild(shape(geometry.paw, 'paw'));
  const pawRight = new Container({ label: 'pawRight', x: LIMB.pawRight.cx, y: LIMB.pawRight.cy });
  pawRight.addChild(shape(geometry.paw, 'paw'));
  const armLeft = joint('armLeft');
  armLeft.addChild(shape(geometry.armLeft, 'arm-left'), pawLeft);
  const armRight = joint('armRight');
  armRight.addChild(shape(geometry.armRight, 'arm-right'), pawRight);
  const frontLegs = new Container({ label: 'frontLegs' });
  frontLegs.addChild(armLeft, armRight);

  // The band is static on the neck; only the knotted end sways, pivoting at the knot.
  const scarf = joint('scarf');
  scarf.addChild(shape(geometry.scarfEnd, 'scarf-end'));

  const head = joint('head');
  const earLeft = joint('earLeft');
  earLeft.addChild(shape(geometry.earLeft, 'ear-left'));
  const earRight = joint('earRight');
  earRight.addChild(shape(geometry.earRight, 'ear-right'));
  const cheeks = new Container({ label: 'cheeks', alpha: 0 });
  cheeks.addChild(shape(geometry.cheeks, 'cheeks'));
  const muzzle = new Container({ label: 'muzzle' });
  muzzle.addChild(shape(geometry.muzzle, 'muzzle'));
  const nose = new Container({ label: 'nose' });
  nose.addChild(shape(geometry.nose, 'nose'));
  // Both mouth parts pivot on the lip line, so a smile arcs down and a frown flips cleanly.
  const mouthOpen = joint('mouth', 'mouthOpen');
  mouthOpen.addChild(shape(geometry.mouthOpen, 'mouth-open'));
  mouthOpen.alpha = 0;
  const mouthCurve = joint('mouth', 'mouthCurve');
  mouthCurve.addChild(shape(geometry.mouthCurve, 'mouth-curve'));
  const browLeft = joint('browLeft');
  browLeft.addChild(shape(geometry.browLeft, 'brow-left'));
  const browRight = joint('browRight');
  browRight.addChild(shape(geometry.browRight, 'brow-right'));
  const left = buildEye('Left', geometry);
  const right = buildEye('Right', geometry);
  head.addChild(
    earLeft,
    earRight,
    shape(geometry.headBall, 'head-ball'),
    cheeks,
    left.eye,
    right.eye,
    // After the patches, so their lower edge tucks behind the muzzle — as in Solution A.
    muzzle,
    browLeft,
    browRight,
    nose,
    mouthOpen,
    mouthCurve,
  );

  // Hearts and sparkles sit outside the figure, so squash and hop never distort them.
  const effects = new Container({ label: 'effects' });
  // Limbs and scarf are children of the torso, so they ride the breath and the squash with it.
  body.addChild(
    backLegs,
    shape(geometry.torso, 'torso'),
    shape(geometry.belly, 'belly'),
    frontLegs,
    scarf,
    shape(geometry.scarfBand, 'scarf-band'),
    shape(geometry.scarfFold, 'scarf-fold'),
  );
  root.addChild(tail, body, head);
  world.addChild(shadow, root, effects);

  return {
    world,
    shadow,
    root,
    tail,
    body,
    backLegs,
    legLeft,
    legRight,
    frontLegs,
    armLeft,
    armRight,
    pawLeft,
    pawRight,
    scarf,
    head,
    earLeft,
    earRight,
    eyeLeft: left.eye,
    eyeRight: right.eye,
    lidLeft: left.lid,
    lidRight: right.lid,
    pupilLeft: left.pupil,
    pupilRight: right.pupil,
    lashLeft: left.lash,
    lashRight: right.lash,
    browLeft,
    browRight,
    muzzle,
    nose,
    mouthCurve,
    mouthOpen,
    cheeks,
    effects,
    destroy() {
      // Shared `GraphicsContext`es were passed in, so PixiJS leaves them alone: only this
      // scene's containers go away, and the next gallery cell still has geometry to draw.
      world.destroy({ children: true });
    },
  };
}
