module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
    'template-curly-spacing': 'error',
    'arrow-spacing': 'error',
    'comma-dangle': ['error', 'never'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'indent': ['error', 2],
    'max-len': ['warn', { code: 120 }],
    'no-trailing-spaces': 'error',
    'eol-last': 'error',

    // Node.js specific rules (eslint-plugin-n)
    'n/no-unsupported-features/es-syntax': 'off',

    // Security rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',

    // Async/await rules
    'require-await': 'error',
    'no-return-await': 'error',
    'no-promise-executor-return': 'error',

    // Error handling
    'prefer-promise-reject-errors': 'error',
    'no-async-promise-executor': 'error'
  },
  overrides: [
    {
      files: ['tests/**/*.js'],
      rules: {
        'no-console': 'off',
        'max-len': 'off'
      }
    },
    {
      files: ['scripts/**/*.js'],
      rules: {
        'no-console': 'off'
      }
    }
  ],
  ignorePatterns: [
    'node_modules/',
    'build/',
    'dist/',
    'coverage/',
    '*.min.js'
  ]
};
