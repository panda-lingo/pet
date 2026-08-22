import type { ReactElement, Ref } from 'react';
import { PandaBody, PandaShadow, PandaTail } from './PandaBody.js';
import { PandaHead } from './PandaHead.js';
import { part, VIEW } from './geometry.js';

export interface PandaSvgProps {
  /** The controller writes pose custom properties onto this element. */
  ref?: Ref<SVGSVGElement>;
  className?: string;
}

/**
 * The panda, as one inline SVG.
 *
 * Layer order is the whole rig: shadow on the floor, then the figure (tail behind the torso,
 * head in front), then an empty effects layer the controller fills with particles.
 *
 * The shadow deliberately sits outside `figure` so that hops and stretches lift the pet away
 * from its contact shadow instead of dragging it along.
 *
 * This component never re-renders while the pet animates — it renders once and the controller
 * drives it through CSS custom properties.
 */
export function PandaSvg({ ref, className }: PandaSvgProps): ReactElement {
  return (
    <svg
      ref={ref}
      className={className ? `pl-panda ${className}` : 'pl-panda'}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      aria-hidden="true"
      focusable="false"
    >
      <PandaShadow />
      <g className={part('figure')}>
        <PandaTail />
        <PandaBody />
        <PandaHead />
      </g>
      <g className="pl-panda__effects" />
    </svg>
  );
}
