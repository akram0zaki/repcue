import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      // Allow intentionally empty catch blocks used for optional platform APIs and test envs
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  // Relax certain strict rules in test files to keep tests readable and maintainable
  {
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/__tests__/**/*.{ts,tsx}',
      'src/__tests__/**/*.{ts,tsx}',
      // Include shared test setup
      'src/test/setup.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      // Large or precise numeric literals in tests are acceptable
      'no-loss-of-precision': 'off',
    },
  },
  // Soft i18n guard: warn on bare string literals in JSX in app code
  {
    files: ['src/**/*.{tsx,jsx}'],
    ignores: ['src/__tests__/**'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: "JSXElement > JSXExpressionContainer Literal[value=/[A-Za-z]/]",
          message: 'Avoid hardcoded strings in JSX; use i18n t() keys instead (add // i18n-exempt with rationale if needed).'
        }
      ]
    }
  }
])
