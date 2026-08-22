/**
 * Solution A's view of the shared artwork.
 *
 * The numbers themselves live in `@pet/core` (`artwork.ts`) so that both renderers author the
 * panda from one source. This module adds only what is specific to an SVG + CSS rig:
 *
 * 1. Shapes are drawn in absolute pet-local coordinates and carry no `transform` attribute, so
 *    each animated group's CSS `transform-box: view-box` local space *is* that coordinate space.
 * 2. Every animated group therefore needs an explicit transform origin, and `pivotVariables()`
 *    publishes the shared pivots as the `--o-*` custom properties `panda.css` reads.
 */

export {
  BELLY,
  CHEEK,
  EAR,
  EYE,
  GROUND,
  HEAD,
  LIMB,
  MOUTH_OPEN,
  MUZZLE,
  PATH,
  PIVOT,
  SHADOW,
  TAIL,
  VIEW,
  type PivotName,
} from '@pet/core';

import { PIVOT } from '@pet/core';

/**
 * Class list for an animated group.
 *
 * `pl-panda__part` pins `transform-box: view-box` and `transform-origin: 0 0` so that every
 * rotation and scale is written explicitly as `translate(pivot) … translate(-pivot)` in
 * `panda.css`. That keeps the rig independent of how a browser resolves a default origin.
 */
export function part(name: string): string {
  return `pl-panda__part pl-panda__${name}`;
}

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * `--o-<part>-x/y` custom properties consumed by `panda.css`.
 *
 * They are written once when the controller starts. The first painted frame is the neutral
 * pose — every rotation is 0 and every scale is 1 — so it is origin-independent, which is why
 * the stylesheet can rely on these without duplicating the numbers as fallbacks.
 */
export function pivotVariables(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [name, [x, y]] of Object.entries(PIVOT)) {
    vars[`--o-${kebab(name)}-x`] = `${x}px`;
    vars[`--o-${kebab(name)}-y`] = `${y}px`;
  }
  return vars;
}
