import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2020,
      },
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // Practical rules for development
      '@typescript-eslint/no-unused-vars': 'warn', // Downgrade to warn
      '@typescript-eslint/no-require-imports': 'warn', // Downgrade to warn
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn', // Downgrade to warn
      '@typescript-eslint/prefer-optional-chain': 'warn', // Downgrade to warn
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn', // Downgrade to warn
      '@typescript-eslint/no-non-null-assertion': 'warn', // Downgrade to warn
      '@typescript-eslint/no-unnecessary-condition': 'warn', // Downgrade to warn
      '@typescript-eslint/prefer-as-const': 'warn', // Downgrade to warn
      '@typescript-eslint/prefer-string-starts-ends-with': 'off', // Disable for now
      '@typescript-eslint/prefer-includes': 'warn', // Downgrade to warn

      // Base rules
      'no-unused-vars': 'off', // Turned off in favor of TypeScript version
      'no-console': 'warn',
      'no-undef': 'off', // Handled by TypeScript
      'no-unused-expressions': 'error',
      'no-case-declarations': 'error',
      'no-unreachable': 'error',
      'no-constant-condition': 'error',
      'no-empty': 'error',
      'no-extra-boolean-cast': 'error',
      'no-global-assign': 'error',
      'no-param-reassign': 'error',
      'no-redeclare': 'error',
      'no-return-assign': 'error',
      'no-self-compare': 'error',
      'no-sequences': 'error',
      'no-throw-literal': 'error',
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-useless-escape': 'error',
      'no-useless-return': 'error',
      'no-void': 'error',
      'no-with': 'error',
      'radix': 'error',
      'yoda': 'error',
    },
  },
  {
    files: ['src/**/__tests__/**/*.ts', 'src/**/__tests__/**/*.tsx', 'src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.spec.ts', 'src/**/*.spec.tsx', 'tests/**/*.ts', 'tests/**/*.tsx'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2020,
        ...globals.jest,
      },
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn', // Downgrade to warn in tests
      '@typescript-eslint/no-explicit-any': 'off', // Allow any in tests
      '@typescript-eslint/no-non-null-assertion': 'off', // Allow ! in tests
      '@typescript-eslint/prefer-nullish-coalescing': 'warn', // Downgrade to warn in tests
      '@typescript-eslint/no-unnecessary-condition': 'warn', // Downgrade to warn in tests
      'no-console': 'off', // Allow console in tests
      'no-unused-expressions': 'warn', // Downgrade to warn in tests
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2020,
      },
    },
    rules: {
      // Base rules for JS files
      'no-unused-vars': 'error',
      'no-console': 'warn',
      'no-unused-expressions': 'error',
      'no-unreachable': 'error',
    },
  },
];