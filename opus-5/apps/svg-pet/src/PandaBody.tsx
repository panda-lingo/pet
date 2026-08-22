import type { ReactElement } from 'react';
import { pandaColor } from '@pet/core';
import { BELLY, LIMB, part, PATH, SHADOW, TAIL } from './geometry.js';

/**
 * Body assembly for Solution A: shadow, tail, torso, back legs, front legs and the scarf.
 *
 * Limbs are thick round strokes rather than filled outlines — one consistent weight, no hard
 * cartoon contour, which is what the brand's illustration rules ask for.
 */

type Side = 'left' | 'right';

/** Contact shadow. Pivot: its own centre, so `shadowScale` spreads symmetrically. */
export function PandaShadow(): ReactElement {
  return (
    <g className={part('shadow')}>
      <ellipse cx={SHADOW.cx} cy={SHADOW.cy} rx={SHADOW.rx} ry={SHADOW.ry} fill="url(#pl-panda-shadow)" />
    </g>
  );
}

/** Tail. Pivot: the attachment point on the lower back. */
export function PandaTail(): ReactElement {
  return (
    <g className={part('tail')}>
      <circle cx={TAIL.cx} cy={TAIL.cy} r={TAIL.r} fill="url(#pl-panda-ink)" />
    </g>
  );
}

/** Back leg. Pivot: the hip. The life-stage leg length scales this group vertically. */
function PandaBackLeg({ side }: { side: Side }): ReactElement {
  const foot = side === 'left' ? LIMB.footLeft : LIMB.footRight;
  return (
    <g className={part(`leg--${side}`)}>
      <path
        d={side === 'left' ? PATH.legLeft : PATH.legRight}
        fill="none"
        stroke="url(#pl-panda-ink)"
        strokeWidth={LIMB.legWidth}
        strokeLinecap="round"
      />
      <ellipse cx={foot.cx} cy={foot.cy} rx={foot.rx} ry={foot.ry} fill={pandaColor.ink} />
    </g>
  );
}

/** Front leg (arm). Pivot: the shoulder — pointing and waving both swing from there. */
function PandaFrontLeg({ side }: { side: Side }): ReactElement {
  const paw = side === 'left' ? LIMB.pawLeft : LIMB.pawRight;
  return (
    <g className={part(`arm--${side}`)}>
      <path
        d={side === 'left' ? PATH.armLeft : PATH.armRight}
        fill="none"
        stroke="url(#pl-panda-ink)"
        strokeWidth={LIMB.armWidth}
        strokeLinecap="round"
      />
      <circle className="pl-panda__paw" cx={paw.cx} cy={paw.cy} r={LIMB.pawR} fill={pandaColor.ink} />
    </g>
  );
}

/**
 * Torso group: everything that breathes. `bodyScaleX/Y` and `bodyRot` are applied here around
 * the hips, so the head (a sibling) keeps its shape while still riding the breath.
 */
export function PandaBody(): ReactElement {
  return (
    <g className={part('torso')}>
      <PandaBackLeg side="left" />
      <PandaBackLeg side="right" />
      <path d={PATH.torso} fill="url(#pl-panda-fur)" />
      <ellipse cx={BELLY.cx} cy={BELLY.cy} rx={BELLY.rx} ry={BELLY.ry} fill="url(#pl-panda-belly)" />
      <PandaFrontLeg side="left" />
      <PandaFrontLeg side="right" />
      <PandaScarf />
    </g>
  );
}

/** Scarf: band plus a hanging end that sways. Pivot of the end: the knot. */
function PandaScarf(): ReactElement {
  return (
    <g className="pl-panda__scarf-group">
      <g className={part('scarf')}>
        <path d={PATH.scarfEnd} fill={pandaColor.scarfDeep} />
      </g>
      <path d={PATH.scarfBand} fill="url(#pl-panda-scarf)" />
      <path d={PATH.scarfFold} fill="none" stroke={pandaColor.scarfDeep} strokeWidth="1.1" opacity="0.5" />
    </g>
  );
}
