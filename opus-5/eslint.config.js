import tseslint from 'typescript-eslint';

/**
 * Type-aware linting is intentionally off: `npm run typecheck` already runs the full
 * program, and the syntactic rules below stay fast enough to run on every commit.
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'dist-html/**',
      'playwright-report/**',
      'test-results/**',
      'screenshots/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      eqeqeq: ['error', 'smart'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['scripts/**/*.mjs', '**/*.config.ts', '**/e2e/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
);
