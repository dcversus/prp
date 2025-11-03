/* eslint-env node */
/* global module */
module.exports = {
  env: {
    browser: false,
    es2021: true,
    node: true,
    worker: true
  },
  globals: {
    module: 'readonly',
    require: 'readonly',
    __dirname: 'readonly',
    __filename: 'readonly'
  },
  extends: [
    '../../.eslintrc.json'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script'
  },
  rules: {
    'no-undef': 'off', // Allow require in worker threads
    '@typescript-eslint/no-require-imports': 'off', // Allow require in worker files
    '@typescript-eslint/no-explicit-any': 'warn', // Allow any types with warning
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }]
  },
  overrides: [
    {
      files: ['inspector-worker.cjs'],
      env: {
        worker: true,
        node: true
      },
      globals: {
        require: 'readonly',
        console: 'readonly',
        workerData: 'readonly',
        parentPort: 'readonly'
      },
      rules: {
        'no-undef': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-unused-vars': ['error', {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }],
        'no-unused-vars': ['error', {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }]
      }
    }
  ]
};