import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** Absolute path to a directory inside the monorepo, with a trailing slash. */
const dir = (relative: string): string => fileURLToPath(new URL(relative, import.meta.url));

/**
 * Solution A build.
 *
 * `viteSingleFile` inlines the JS and CSS so the delivered artefact is one HTML file that
 * opens straight from disk (`file://`) with no server. React is deduped because three
 * workspace packages declare it.
 *
 * Aliases point at package *source* instead of a build step, and are written as exact
 * patterns: a bare-prefix alias would rewrite `@pandalingo/site/site.css` into a path inside
 * `index.ts`. The `$1` form keeps stylesheet subpaths resolving to real files.
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
    chunkSizeWarningLimit: 2_000,
  },
});
