import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** Absolute path to a directory inside the monorepo, with a trailing slash. */
const dir = (relative: string): string => fileURLToPath(new URL(relative, import.meta.url));

/**
 * Solution B build.
 *
 * Identical strategy to Solution A: `viteSingleFile` inlines JS and CSS so the delivered
 * artefact is one HTML file that opens from `file://`. PixiJS is a large dependency, so it is
 * imported only by the lazy pet chunk — which the single-file build then inlines, meaning the
 * one-file artefact trades the lazy-loading win for portability (documented in the README).
 *
 * Aliases are exact patterns so `@pandalingo/site/site.css` keeps resolving to a real file.
 */
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: /^@pet\/core$/, replacement: `${dir('../../packages/pet-core/src/')}index.ts` },
      { find: /^@pet\/core\/(.+)$/, replacement: `${dir('../../packages/pet-core/src/')}$1` },
      { find: /^@pet\/react$/, replacement: `${dir('../../packages/pet-react/src/')}index.ts` },
      { find: /^@pet\/react\/(.+)$/, replacement: `${dir('../../packages/pet-react/src/')}$1` },
      { find: /^@pandalingo\/site$/, replacement: `${dir('../../packages/site/src/')}index.ts` },
      { find: /^@pandalingo\/site\/(.+)$/, replacement: `${dir('../../packages/site/src/')}$1` },
    ],
  },
  build: {
    target: 'es2022',
    // One file: no hashed asset URLs to resolve relative to `file://`.
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 3_000,
  },
});
