import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

/**
 * Flat config, required by eslint-config-next 16 — it no longer ships an
 * eslintrc-compatible shape, so the old `.eslintrc.json` crashed during config
 * resolution and ESLint could not run against this project at all.
 */
export default [
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'next-env.d.ts',
      'playwright-report/**',
      'test-results/**',
      // Generated from the backend's OpenAPI schema by `npm run generate-client`.
      'src/lib/api/generated/**',
    ],
  },
  ...nextCoreWebVitals,
  {
    rules: {
      // React renders bare apostrophes and quotes correctly; escaping them only
      // makes the copy harder to read and edit.
      'react/no-unescaped-entities': 'off',

      // eslint-plugin-react-hooks 7 added the React Compiler rules below. They
      // flag real patterns worth moving away from, but this codebase predates
      // them by a few hundred call sites, so they warn rather than block until
      // that backlog is worked through.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
];
