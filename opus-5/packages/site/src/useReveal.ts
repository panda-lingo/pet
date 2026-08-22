import { useEffect } from 'react';

/**
 * Reveals `[data-reveal]` sections once, on first scroll into view: opacity and a small
 * translateY only, which is all the brand motion rules allow. Without an
 * `IntersectionObserver` (jsdom) everything is revealed immediately rather than hidden.
 */
export function useReveal(key: unknown): void {
  useEffect(() => {
    const nodes = document.querySelectorAll('[data-reveal]');
    if (typeof IntersectionObserver === 'undefined') {
      nodes.forEach((node) => node.setAttribute('data-revealed', 'true'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute('data-revealed', 'true');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.1 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [key]);
}
