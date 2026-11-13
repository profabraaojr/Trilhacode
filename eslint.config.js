import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'apps/api/drizzle/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    // scripts clássicos servidos como estão (sem build), antes do bundle da interface
    files: ['apps/web/public/**/*.js'],
    languageOptions: { globals: globals.browser, sourceType: 'script' },
  },
  {
    files: ['apps/api/**/*.ts', '**/*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
