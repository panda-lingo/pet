import { useEffect } from 'react';
import { brandCssVariables } from '@pet/core';

/**
 * Publishes the brand tokens as CSS custom properties on `:root`.
 *
 * The stylesheets carry literal fallbacks for the first paint, but every value that both
 * renderers must agree on lives in `brand.ts` — so the page reads it from there rather
 * than duplicating hex codes in CSS.
 */
export function useBrandTokens(): void {
  useEffect(() => {
    const root = document.documentElement;
    const tokens = brandCssVariables();
    for (const [name, value] of Object.entries(tokens)) {
      root.style.setProperty(name, value);
    }
    return () => {
      for (const name of Object.keys(tokens)) root.style.removeProperty(name);
    };
  }, []);
}
