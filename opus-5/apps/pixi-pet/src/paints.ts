import { FillGradient } from 'pixi.js';
import { hexToNumber, pandaColor } from '@pet/core';

/**
 * Brand paints for Solution B.
 *
 * These are the PixiJS equivalents of Solution A's `<defs>` gradients — same stops, same
 * directions, same brand rule (warm, never pure black, light from the upper left). Building
 * them here rather than inside the artwork keeps one copy per page: gradients bake a small
 * texture, so the live pet and every gallery cell share these objects.
 *
 * `textureSpace: 'local'` is the analogue of SVG's `objectBoundingBox` units, which is why the
 * stop coordinates below are the same 0–1 numbers as in `PandaDefs.tsx`.
 */

export interface PandaPaints {
  fur: FillGradient | number;
  head: FillGradient | number;
  ink: FillGradient | number;
  scarf: FillGradient | number;
  belly: FillGradient | { color: string };
  shadow: FillGradient | { color: string };
  muzzle: number;
  inkFlat: number;
  inkSoft: number;
  scarfDeep: number;
  coatShade: number;
  cheek: number;
  eyeWhite: number;
  pupil: number;
}

export interface PaintOptions {
  /**
   * Gradients bake a texture through a 2D canvas context. jsdom has none, so the unit tests
   * build the artwork with flat brand colours instead of skipping the artwork altogether.
   */
  gradients?: boolean;
}

const cache = new Map<boolean, PandaPaints>();
/** One linear gradient, in the shape's own 0–1 box. */
function linear(
  start: { x: number; y: number },
  end: { x: number; y: number },
  colorStops: readonly { offset: number; color: string }[],
): FillGradient {
  return new FillGradient({ type: 'linear', start, end, colorStops: [...colorStops], textureSpace: 'local' });
}

/** One radial gradient, centred in the shape's own 0–1 box. */
function radial(
  center: { x: number; y: number },
  outerRadius: number,
  colorStops: readonly { offset: number; color: string }[],
): FillGradient {
  return new FillGradient({
    type: 'radial',
    center,
    innerRadius: 0,
    outerCenter: center,
    outerRadius,
    colorStops: [...colorStops],
    textureSpace: 'local',
  });
}

export function createPaints({ gradients = true }: PaintOptions = {}): PandaPaints {
  const cached = cache.get(gradients);
  if (cached) return cached;

  const flat = {
    muzzle: hexToNumber(pandaColor.muzzle),
    inkFlat: hexToNumber(pandaColor.ink),
    inkSoft: hexToNumber(pandaColor.inkSoft),
    scarfDeep: hexToNumber(pandaColor.scarfDeep),
    coatShade: hexToNumber(pandaColor.coatShade),
    cheek: hexToNumber(pandaColor.scarf),
    eyeWhite: hexToNumber(pandaColor.eyeWhite),
    pupil: 0x211e1b,
  } as const;
  const paints: PandaPaints = gradients
    ? {
        ...flat,
        fur: linear({ x: 0.15, y: 0 }, { x: 0.85, y: 1 }, [
          { offset: 0, color: pandaColor.muzzle },
          { offset: 0.52, color: pandaColor.fur },
          { offset: 1, color: pandaColor.furShade },
        ]),
        // The head catches light from the upper left, which is where the site's hero light is.
        head: radial({ x: 0.36, y: 0.28 }, 0.82, [
          { offset: 0, color: '#FFFFFF' },
          { offset: 0.58, color: pandaColor.fur },
          { offset: 1, color: pandaColor.furShade },
        ]),
        ink: linear({ x: 0.2, y: 0 }, { x: 0.8, y: 1 }, [
          { offset: 0, color: pandaColor.inkSoft },
          { offset: 1, color: pandaColor.ink },
        ]),
        scarf: linear({ x: 0, y: 0 }, { x: 0.7, y: 1 }, [
          { offset: 0, color: '#C79C68' },
          { offset: 1, color: pandaColor.scarfDeep },
        ]),
        belly: radial({ x: 0.5, y: 0.42 }, 0.62, [
          { offset: 0, color: 'rgba(255, 255, 255, 0.85)' },
          { offset: 1, color: 'rgba(255, 255, 255, 0)' },
        ]),
        shadow: radial({ x: 0.5, y: 0.5 }, 0.5, [
          { offset: 0, color: 'rgba(42, 39, 36, 0.5)' },
          { offset: 1, color: 'rgba(42, 39, 36, 0)' },
        ]),
      }
    : {
        ...flat,
        fur: hexToNumber(pandaColor.fur),
        head: hexToNumber(pandaColor.fur),
        ink: flat.inkFlat,
        scarf: hexToNumber(pandaColor.scarf),
        belly: { color: 'rgba(255, 255, 255, 0.4)' },
        shadow: { color: pandaColor.shadow },
      };

  cache.set(gradients, paints);
  return paints;
}
