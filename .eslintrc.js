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
    // Custom rules for BitFlow project
    'no-console': 'warn', // Allow console in non-production code
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
    
    // Node.js specific rules
    'node/no-unsupported-features/es-syntax': 'off',
    'node/no-missing-import': 'error',
    'node/no-extraneous-import': 'error',
    
    // Test-specific rules
    'jest/expect-expect': 'error',
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error',
    
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
        'no-console': 'off', // Allow console in tests
        'max-len': 'off', // Allow longer lines in tests
        'node/no-missing-require': 'off' // Allow test-only requires
      }
    },
    {
      files: ['scripts/**/*.js'],
      rules: {
        'no-console': 'off', // Allow console in CLI scripts
        'no-process-exit': 'off' // Allow process.exit in CLI scripts
      }
    },
    {
      files: ['contracts/**/*.cairo'],
      parser: 'cairo-parser',
      rules: {
        'cairo/func-casing': 'error',
        'cairo/variable-naming': 'error'
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