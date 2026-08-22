import type { ReactElement } from 'react';
import { pandaColor } from '@pet/core';

/**
 * Gradients for the panda, rendered once per document.
 *
 * SVG paint references are document-scoped, so a single hidden `<svg>` serves every panda on
 * the page — the live pet and all eleven gallery states — without duplicating ids or paying
 * for repeated gradient definitions.
 *
 * All stops use `objectBoundingBox` units (the SVG default) so the same gradient maps
 * correctly onto shapes of different sizes.
 */
export function PandaDefs(): ReactElement {
  return (
    <svg className="pl-panda-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="pl-panda-fur" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor={pandaColor.muzzle} />
          <stop offset="0.52" stopColor={pandaColor.fur} />
          <stop offset="1" stopColor={pandaColor.furShade} />
        </linearGradient>
        {/* The head catches light from the upper left, which is where the site's hero light is. */}
        <radialGradient id="pl-panda-head" cx="0.36" cy="0.28" r="0.82">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.58" stopColor={pandaColor.fur} />
          <stop offset="1" stopColor={pandaColor.furShade} />
        </radialGradient>
        <linearGradient id="pl-panda-ink" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={pandaColor.inkSoft} />
          <stop offset="1" stopColor={pandaColor.ink} />
        </linearGradient>
        <linearGradient id="pl-panda-scarf" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#C79C68" />
          <stop offset="1" stopColor={pandaColor.scarfDeep} />
        </linearGradient>
        <radialGradient id="pl-panda-belly" cx="0.5" cy="0.42" r="0.62">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pl-panda-shadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={pandaColor.ink} stopOpacity="0.5" />
          <stop offset="1" stopColor={pandaColor.ink} stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
