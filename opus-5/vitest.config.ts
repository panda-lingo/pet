import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * One Vitest run covers all three projects: the framework-free domain core in Node, and
 * the two apps in jsdom. Playwright specs (`*.e2e.spec.ts`) are deliberately excluded.
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'pet-core',
          root: './packages/pet-core',
          environment: 'node',
          include: ['test/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        resolve: { dedupe: ['react', 'react-dom'] },
        test: {
          name: 'svg-pet',
          root: './apps/svg-pet',
          environment: 'jsdom',
          globals: false,
          setupFiles: ['./tests/setup.ts'],
          include: ['tests/**/*.test.{ts,tsx}'],
        },
      },
      {
        plugins: [react()],
        resolve: { dedupe: ['react', 'react-dom'] },
        test: {
          name: 'pixi-pet',
          root: './apps/pixi-pet',
          environment: 'jsdom',
          globals: false,
          setupFiles: ['./tests/setup.ts'],
          include: ['tests/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
});
