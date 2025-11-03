/* eslint-env node */
module.exports = {
  env: {
    browser: false,
    es2021: true,
    node: true,
    worker: true
  },
  extends: [
    '../../.eslintrc.js'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script'
  },
  rules: {
    'no-undef': 'off', // Allow require in worker threads
    '@typescript-eslint/no-require-imports': 'off' // Allow require in worker files
  },
  overrides: [
    {
      files: ['inspector-worker.js'],
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
        'no-unused-vars': ['error', {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }]
      }
    }
  ]
};