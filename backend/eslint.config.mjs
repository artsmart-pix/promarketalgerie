import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_|next|err' }],
      'no-console': 'off',
      'semi': ['warn', 'always'],
      'no-var': 'warn',
    },
  },
  {
    ignores: ['node_modules/', 'uploads/', 'database.sqlite'],
  },
];
