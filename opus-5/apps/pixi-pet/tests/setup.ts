import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * jsdom shims for Solution B's tests.
 *
 * Only three things are faked, and each one is a jsdom gap rather than a behaviour the tests
 * want to control:
 *
 * 1. `matchMedia` — jsdom has no media engine. The stub reads
 *    `document.documentElement.dataset.reducedMotion`, so a test opts into reduced motion by
 *    setting one attribute and the production code path stays untouched.
 * 2. `getBoundingClientRect` — jsdom lays nothing out, so every box is 0×0 and the guide's
 *    `usableRect` check would reject every target. A synthetic box makes targets findable.
 * 3. `scrollIntoView` / `scrollTo` — not implemented in jsdom; both are no-ops here.
 *
 * WebGL is deliberately *not* shimmed. `Application.init()` therefore fails, `createPixiStage`
 * resolves to `null`, and the pet falls back to its canvas-less state — which is exactly the
 * degradation path the brief asks for, so these tests prove the page, the bubble, the tour and
 * the controls all keep working without a renderer. Scene-graph and per-frame behaviour is
 * tested directly, without a renderer, in `controller.test.ts`.
 */

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

function mediaQueryList(query: string): MediaQueryList {
  const reduced = document.documentElement.dataset.reducedMotion === 'true';
  const list: MediaQueryList = {
    matches: query === REDUCED_QUERY ? reduced : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  };
  return list;
}

window.matchMedia = (query: string): MediaQueryList => mediaQueryList(query);

/** One box for every element: enough for placement maths, stable enough to assert against. */
Element.prototype.getBoundingClientRect = function synthetic(this: Element): DOMRect {
  const rect = { x: 40, y: 160, width: 240, height: 48 };
  const box = { ...rect, top: rect.y, left: rect.x, right: rect.x + rect.width, bottom: rect.y + rect.height };
  return { ...box, toJSON: () => box } as DOMRect;
};

Element.prototype.scrollIntoView = function noop(): void {};
window.scrollTo = function noop(): void {};

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.reducedMotion;
  window.location.hash = '';
});
