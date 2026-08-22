import type { ReactElement } from 'react';
import { pandaColor } from '@pet/core';
import { CHEEK, EAR, EYE, HEAD, MOUTH_OPEN, MUZZLE, part, PATH } from './geometry.js';

/**
 * Head assembly for Solution A.
 *
 * Every animated group carries `pl-panda__part` (which pins `transform-box: view-box` and
 * `transform-origin: 0 0`) plus one specific class whose rule in `panda.css` reads the pose
 * custom properties. Shapes themselves stay static: nothing in this file re-renders while the
 * pet animates.
 */

type Side = 'left' | 'right';

/** Ear. Pivot: the point where the ear meets the skull, so a twitch rocks rather than slides. */
function PandaEar({ side }: { side: Side }): ReactElement {
  const { cx, cy } = EAR[side];
  return (
    <g className={part(`ear--${side}`)}>
      <circle cx={cx} cy={cy} r={EAR.r} fill="url(#pl-panda-ink)" />
      <circle cx={cx} cy={cy + 1.2} r={EAR.innerR} fill={pandaColor.inkSoft} opacity="0.85" />
    </g>
  );
}

/**
 * Eye. Three nested groups, each with its own job:
 * `eye--side` carries the life-stage eye scale, `lid--side` closes the lid (scaleY), and
 * `pupil--side` orbits the gaze inside the white.
 */
function PandaEye({ side }: { side: Side }): ReactElement {
  const { cx, cy } = EYE[side];
  const tilt = side === 'left' ? -EYE.patch.tilt : EYE.patch.tilt;
  return (
    <g className={part(`eye--${side}`)}>
      <ellipse
        cx={cx}
        cy={cy}
        rx={EYE.patch.rx}
        ry={EYE.patch.ry}
        fill="url(#pl-panda-ink)"
        transform={`rotate(${tilt} ${cx} ${cy})`}
      />
      <g className={part(`lid--${side}`)}>
        <ellipse cx={cx} cy={cy} rx={EYE.whiteRx} ry={EYE.whiteRy} fill={pandaColor.muzzle} opacity="0.96" />
        <g className={part(`pupil--${side}`)}>
          <circle cx={cx} cy={cy} r={EYE.pupilR} fill="#211E1B" />
          <circle cx={cx - 1} cy={cy - 1.1} r={0.95} fill={pandaColor.eyeWhite} opacity="0.92" />
        </g>
      </g>
      {/* Closed lid: fades in as the eye closes, so a blink still reads at 48px. */}
      <path
        className={part(`lash--${side}`)}
        d={`M${cx - 4.4} ${cy}q4.4 2.6 8.8 0`}
        fill="none"
        stroke={pandaColor.muzzle}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </g>
  );
}

/**
 * Brow. Pivot: the brow midpoint — `browAngle` rotates there, `browY` only lifts.
 *
 * Drawn in the coat mid-tone rather than the fur line colour: a brow that cannot be seen
 * cannot carry a mood, and the moods lean on `browY` / `browAngle` more than on the mouth.
 */
function PandaBrow({ side }: { side: Side }): ReactElement {
  return (
    <path
      className={part(`brow--${side}`)}
      d={side === 'left' ? PATH.browLeft : PATH.browRight}
      fill="none"
      stroke={pandaColor.coatShade}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  );
}

export function PandaHead(): ReactElement {
  return (
    <g className={part('head')}>
      <PandaEar side="left" />
      <PandaEar side="right" />
      <circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} fill="url(#pl-panda-head)" />
      {/* Cheeks carry both the life-stage markings and the blush, hence one opacity var. */}
      <g className={part('cheeks')}>
        <ellipse cx={CHEEK.left.cx} cy={CHEEK.left.cy} rx={CHEEK.rx} ry={CHEEK.ry} fill={pandaColor.scarf} />
        <ellipse cx={CHEEK.right.cx} cy={CHEEK.right.cy} rx={CHEEK.rx} ry={CHEEK.ry} fill={pandaColor.scarf} />
      </g>
      <PandaEye side="left" />
      <PandaEye side="right" />
      {/* Drawn after the patches so their lower edge tucks behind the muzzle. */}
      <ellipse cx={MUZZLE.cx} cy={MUZZLE.cy} rx={MUZZLE.rx} ry={MUZZLE.ry} fill={pandaColor.muzzle} />
      <PandaBrow side="left" />
      <PandaBrow side="right" />
      <path d={PATH.nose} fill="url(#pl-panda-ink)" />
      <g className={part('mouth-open')}>
        <ellipse cx={MOUTH_OPEN.cx} cy={MOUTH_OPEN.cy} rx={MOUTH_OPEN.rx} ry={MOUTH_OPEN.ry} fill={pandaColor.ink} />
      </g>
      <g className={part('mouth-curve')}>
        <path d={PATH.mouth} fill="none" stroke={pandaColor.ink} strokeWidth="2" strokeLinecap="round" />
      </g>
    </g>
  );
}
