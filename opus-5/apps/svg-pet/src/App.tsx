import { lazy, Suspense, useEffect, useState, type ReactElement } from 'react';
import { PetProvider, usePet } from '@pet/react';
import { DemoPanel, PandaLingoSite, useBrandTokens } from '@pandalingo/site';
import { Gallery } from './Gallery.js';
import { PandaDefs } from './PandaDefs.js';

/**
 * Solution A's application shell.
 *
 * Two things here are deliberate:
 *
 * 1. The pet is a lazy chunk *and* is mounted a beat after first paint, so the page's own
 *    content is never waiting on it. `Suspense` renders nothing while it arrives — a missing
 *    companion is invisible, not a layout hole.
 * 2. `#gallery` replaces the page instead of decorating it, which keeps the review frames free
 *    of a live pet and makes them safe to screenshot.
 */

const SvgPet = lazy(async () => ({ default: (await import('./SvgPet.js')).SvgPet }));

/** True once the browser has had a chance to paint the page. */
function useDeferredMount(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const idle = window.requestIdleCallback;
    if (typeof idle === 'function') {
      const handle = idle(() => setReady(true), { timeout: 1_200 });
      return () => window.cancelIdleCallback?.(handle);
    }
    const timer = window.setTimeout(() => setReady(true), 200);
    return () => window.clearTimeout(timer);
  }, []);
  return ready;
}

function useIsGalleryRoute(): boolean {
  const [gallery, setGallery] = useState(() => window.location.hash === '#gallery');
  useEffect(() => {
    const update = () => setGallery(window.location.hash === '#gallery');
    window.addEventListener('hashchange', update);
    update();
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return gallery;
}
function SiteWithPet(): ReactElement {
  const { actions, tours } = usePet();
  const petReady = useDeferredMount();
  const firstTour = tours[0];

  return (
    <>
      <PandaLingoSite
        edition="Solution A · SVG"
        onStartTour={firstTour ? () => actions.startTour(firstTour.id) : undefined}
      >
        <DemoPanel renderer="An inline SVG rig" />
      </PandaLingoSite>
      <Suspense fallback={null}>{petReady ? <SvgPet /> : null}</Suspense>
    </>
  );
}

export function App(): ReactElement {
  useBrandTokens();
  const gallery = useIsGalleryRoute();

  return (
    <>
      {/* Document-scoped paint servers: one copy serves the live pet and every gallery cell. */}
      <PandaDefs />
      {gallery ? (
        <Gallery />
      ) : (
        <PetProvider>
          <SiteWithPet />
        </PetProvider>
      )}
    </>
  );
}
