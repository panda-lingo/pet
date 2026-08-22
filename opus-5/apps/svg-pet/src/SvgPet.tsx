import { useEffect, useRef, type ReactElement } from 'react';
import { PetOverlay, usePet } from '@pet/react';
import { PandaSvg } from './PandaSvg.js';
import { createSvgAnimationController } from './svgAnimationController.js';

/**
 * Solution A's renderer: one inline SVG inside the shared pet chrome.
 *
 * The only bridge between React and the animation is this effect. It starts the controller
 * once, on mount, and the controller then reads `runtime` — the mutable object the provider
 * updates — every frame. Nothing here re-renders while the pet is alive.
 */
export function SvgPet(): ReactElement {
  const { runtime, engine } = usePet();
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const root = svgRef.current;
    if (!root) return;
    const controller = createSvgAnimationController({ root, runtime, engine });
    controller.start();
    return () => controller.stop();
  }, [runtime, engine]);

  return (
    <PetOverlay>
      <PandaSvg ref={svgRef} />
    </PetOverlay>
  );
}
