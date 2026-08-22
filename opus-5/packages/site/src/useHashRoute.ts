import { useCallback, useEffect, useState } from 'react';

export type SiteRoute = '#home' | '#speak';

const ROUTES: readonly SiteRoute[] = ['#home', '#speak'];

function readRoute(): SiteRoute {
  if (typeof window === 'undefined') return '#home';
  const hash = window.location.hash as SiteRoute;
  return ROUTES.includes(hash) ? hash : '#home';
}

/**
 * Hash routing, deliberately tiny.
 *
 * The guide engine navigates by writing `window.location.hash`, so the router must be
 * driven by `hashchange` and nothing else — that is the contract the tour relies on when
 * it walks the pet from the home page to the practice page.
 */
export function useHashRoute(): { route: SiteRoute; navigate: (route: SiteRoute) => void } {
  const [route, setRoute] = useState<SiteRoute>(readRoute);

  useEffect(() => {
    const update = () => setRoute(readRoute());
    window.addEventListener('hashchange', update);
    update();
    return () => window.removeEventListener('hashchange', update);
  }, []);

  const navigate = useCallback((next: SiteRoute) => {
    if (typeof window !== 'undefined') window.location.hash = next;
  }, []);

  return { route, navigate };
}
